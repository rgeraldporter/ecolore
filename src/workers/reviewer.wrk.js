const db = require('../models/index');
const R = require('ramda');
const Future = require('fluture');
const flatten = require('array-flatten');
const { Maybe } = require('simple-maybe');
const request = require('request');
const requestF = Future.encaseN(request);

const createLog = Future.encaseP(a => db.Log.create(a));
const findOneAcousticFile = Future.encaseP(a => db.AcousticFile.findOne(a));
const findAllObservations = Future.encaseP(a => db.Observation.findAll(a));
const updateAcousticFile = Future.encaseP(([a, b]) =>
    db.AcousticFile.update(a, b)
);

const flagReviewedAcousticFiles = callback =>
    findAllObservations({
        where: db.Sequelize.literal(
            "json_unquote(json_extract(`Observation`.`data`,'$.filename')) IS NOT NULL"
        )
    })
        .map(observations =>
            observations.reduce(
                (acc, cur) =>
                    acc.includes(cur.get('data').filename)
                        ? acc
                        : acc.concat([cur.get('data').filename]),
                []
            )
        )
        .map(filesReviewed =>
            filesReviewed.map(file =>
                updateAcousticFile([
                    {
                        reviewed: 1
                    },
                    {
                        where: {
                            name: file
                        }
                    }
                ])
            )
        )
        .chain(updates => Future.parallel(1, updates))
        .fork(
            reason => {
                callback ? callback(reason) : null;
            },
            () => {
                callback ? callback() : null;
            }
        );

module.exports = {
    flagReviewedAcousticFiles
};
