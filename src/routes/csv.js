const passwordless = require('passwordless');
const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const fs = require('fs');
const moment = require('moment');
const csv = require('csv-express');
const { Maybe } = require('simple-maybe');
const { assembleCsv, findAllColumns } = require('../helpers/csv-helper');

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
                ]).then(membership =>
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
                }).then(observations => ({ project, observations }))
            )
            .then(findAllColumns)
            .then(assembleCsv)
            .then(csvData => {
                res.csv(csvData, true, {
                    'Content-disposition': 'attachment; filename=data.csv',
                    'Content-Type': 'text/csv'
                });
            });
    });
};
