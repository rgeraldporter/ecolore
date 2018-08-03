const passwordless = require('passwordless');
const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const fs = require('fs');
const moment = require('moment');
const csv = require('csv-express');
const { Maybe } = require('simple-maybe');
const isFormatFile = path => fs.existsSync(__dirname + '/../formats/' + path);
const formatPath = __dirname + '/../formats/';

const findUserAsMemberOfProject = ([id, projectId, required = true]) =>
    db.User.findOne({
        where: { id },
        include: [
            {
                model: db.Membership,
                where: { projectId },
                required
            }
        ]
    });

const findProject = projectId =>
    db.Project.findOne({
        where: { id: projectId }
    });

module.exports = function(router) {
    router.get('/data/csv/cycle/:cycleId', (req, res) => {
        db.Cycle.findOne({
            where: { id: req.params.cycleId }
        })
            .then(cycle =>
                findUserAsMemberOfProject([
                    res.locals.user.get('id'),
                    cycle.get('projectId')
                ]).then(
                    membership =>
                        membership ? cycle : res.redirect(req.header('Referer'))
                )
            )
            .then(cycle => findProject(cycle.get('projectId')))
            .then(project =>
                db.Observation.findAll({
                    include: [
                        {
                            model: db.Survey,
                            where: { cycleId: req.params.cycleId },
                            include: [db.Cycle],
                            required: true
                        }
                    ]
                }).then(observations => [project, observations])
            )
            .then(([project, observations]) => {
                // go through them all to find all columns possible
                let dataCols = observations.reduce((acc, observation) => {
                    const observationData = JSON.parse(observation.data);
                    const surveyData = JSON.parse(observation.Survey.data);
                    const allData = Object.assign(surveyData, observationData);
                    return acc.concat(Object.keys(allData));
                }, []);

                //make unique
                dataCols = [
                    'Start Time',
                    'End Time',
                    'Survey ID',
                    'Observation ID',
                    ...new Set(dataCols)
                ];

                if (isFormatFile(`custom/${project.get('slug')}.format.js`)) {
                    const formatCols = require(`${formatPath}custom/${project.get(
                        'slug'
                    )}.format.js`).columns;

                    // find those not in format file, tack onto the end
                    const diffCols = dataCols.filter(
                        x => !formatCols.includes(x)
                    );
                    dataCols = formatCols.concat(diffCols);
                }

                const emptyObj = {};
                dataCols.forEach(col => (emptyObj[col] = null));

                return [emptyObj, observations];
            })
            .then(([emptyObj, observations]) => {
                const csvData = observations.map(observation => {
                    const meta = {
                        'Start Time': observation.Survey.start,
                        'End Time': observation.Survey.end,
                        'Survey ID': observation.surveyId,
                        'Observation ID': observation.id
                    };
                    const observationData = JSON.parse(observation.data);
                    const surveyData = JSON.parse(observation.Survey.data);

                    const assembleRow = metaCols => obsCols => surveyCols =>
                        Object.assign(metaCols, obsCols, surveyCols);

                    return Maybe.of(assembleRow)
                        .ap(Maybe.of(meta))
                        .ap(Maybe.of(observationData))
                        .ap(Maybe.of(surveyData))
                        .fork(console.error, a => a);
                });
                csvData.unshift(emptyObj);
                res.csv(csvData, true, {
                    'Content-disposition': 'attachment; filename=data.csv',
                    'Content-Type': 'text/csv'
                });
            });
    });
};
