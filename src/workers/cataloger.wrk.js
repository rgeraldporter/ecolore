const db = require('../models/index');
const R = require('ramda');
const Future = require('fluture');
const flatten = require('array-flatten');
const { Maybe } = require('simple-maybe');
const request = require('request');
const requestF = Future.encaseN(request);

const createLog = Future.encaseP(a => db.Log.create(a));
const findAllProjects = Future.encaseP(a => db.Project.findAll(a));
const findAllSurveys = Future.encaseP(a => db.Survey.findAll(a));
const createAcousticFiles = Future.encaseP(a => db.AcousticFile.create(a));

const getAcousticSurveyProjectCycles = () =>
    findAllProjects({
        where: { model: 'acoustic-survey' },
        include: [db.Cycle]
    });

const getAcousticSurveys = () =>
    findAllSurveys({
        include: [
            {
                model: db.Cycle,
                include: [
                    {
                        model: db.Project,
                        where: {
                            model: 'acoustic-survey'
                        }
                    }
                ]
            },
            db.AcousticFile
        ]
    });

const getMetadataUrl = url => url.replace('/details/', '/metadata/');

const retrieveAndSaveFiles = ({ surveyId, url }) =>
    requestF({ url, json: true }).chain(response => {
        const json = response.body;
        if (json.files) {
            const files = json.files.reduce((acc, cur) => {
                return cur.source === 'original' && cur.format === 'WAVE'
                    ? acc.concat([
                          {
                              name: cur.name.slice(0, -4),
                              surveyId,
                              data: {
                                  derived: {}
                              }
                          }
                      ])
                    : acc;
            }, []);
            const saveFiles = () => files.map(createAcousticFiles);
            return Future.parallel(1, saveFiles());
        }
        return Future.of(true);
    });

const catalogAudioFiles = callback => {
    getAcousticSurveys()
        .map(surveys =>
            // filter any with files
            surveys.filter(survey => survey.AcousticFiles.length === 0)
        )
        .map(surveys =>
            surveys
                .map(survey => ({
                    url: Maybe.of(survey.get('data'))
                        .map(a => a['archive_org_url'])
                        .fork(_ => '', a => a),
                    id: survey.get('id')
                }))
                .filter(survey => survey.url.length > 0)
        )
        .chain(surveyUrls => {
            const urlFutures = () =>
                surveyUrls.map(survey =>
                    retrieveAndSaveFiles({
                        url: getMetadataUrl(survey.url),
                        surveyId: survey.id
                    })
                );
            return Future.parallel(1, urlFutures());
        })
        .fork(err => {
            callback ? callback(err) : null;
        }, () => {
            callback ? callback() : null;
        });
};

module.exports = {
    catalogAudioFiles
};
