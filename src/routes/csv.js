const passwordless = require('passwordless');
const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const moment = require('moment');
const csv = require('csv-express');
const {Maybe} = require('simple-maybe');

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

module.exports = function(router) {
    router.get('/data/csv/cycle/:cycleId', (req, res) => {
        db.Cycle.findOne({
            id: req.params.cycleId
        })
            .then(cycle =>
                findUserAsMemberOfProject([
                    res.locals.user.get('id'),
                    cycle.get('projectId')
                ]).then(
                    membership =>
                        membership ? true : res.redirect(req.header('Referer'))
                )
            )
            .then(() =>
                db.Observation.findAll({
                    include: [
                        {
                            model: db.Survey,
                            where: { cycleId: req.params.cycleId },
                            include: [db.Cycle],
                            required: true
                        }
                    ]
                })
            )
            .then(observations => {
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
                        Object.assign(
                            meta,
                            obsCols,
                            surveyCols
                        )

                    return Maybe.of(assembleRow)
                        .ap(Maybe.of(meta))
                        .ap(Maybe.of(observationData))
                        .ap(Maybe.of(surveyData))
                        .fork(console.error, a => a);
                });
                res.csv(csvData, true, {
                    'Content-disposition': 'attachment; filename=data.csv',
                    'Content-Type': 'text/csv'
                });
            });
    });
};
