const fs = require('fs-extra');
const rimraf = require('rimraf');
const R = require('ramda');
const sox = require('sox.js');
const ffmpeg = require('ffmpeg-static');
const Future = require('fluture');
const https = require('https');
const { Maybe } = require('simple-maybe');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const request = require('request');
const db = require('../models/index');
const Op = db.Sequelize.Op;
const moment = require('moment');
const flatten = require('array-flatten');
const {
    uploadToArchiveOrg,
    buildBucketName
} = require('../helpers/archive-org-helper');

const deriveAudioFileLimit = 18; // 36 = one day
const minFrequencyBandwidth = 4000;
const durationPadding = 2;
const cuePadding = 1;
const getFrequencyCeiling = ({ frequencyCeiling, frequencyFloor }) =>
    frequencyCeiling - frequencyFloor < minFrequencyBandwidth
        ? frequencyFloor + minFrequencyBandwidth
        : frequencyCeiling;

const getFrequencyFloor = (frequencyFloor) => frequencyFloor > 0 ? frequencyFloor : 0;

const getCollection = () => process.env.TEST_COLLECTION ? 'test_collection' : 'opensource_audio';

const findAllAcousticFiles = Future.encaseP(a => db.AcousticFile.findAll(a));
const findAllObservations = Future.encaseP(a => db.Observation.findAll(a));
const updateAcousticFile = Future.encaseP(([a, b]) =>
    db.AcousticFile.update(a, b)
);
const createLog = Future.encaseP(a => db.Log.create(a));
const createDerivedFiles = Future.encaseP(a => db.DerivedFile.bulkCreate(a));
const deleteDerivedFiles = Future.encaseP(a => db.DerivedFile.destroy(a));

const trimmedString = ({ string, length }) =>
    string.length > length ? string.substring(0, length - 3) + '...' : string;

const getCue = start => (start - cuePadding < 0 ? 0 : start - cuePadding);

const fileNameToDateTime = ({ filename, seconds }) => {
    const datestring = filename.slice(0, -4);
    return moment(
        filename.split('_')[1] + datestring.split('_')[2],
        'YYYYMMDDHHmmss'
    )
        .add(seconds, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss');
};

const download = ({ url, dest, cb }) => {
    request.head(url, (err, res, body) => {
        request(url)
            .pipe(fs.createWriteStream(dest))
            .on('close', cb);
    });
};

const buildObservationTable = (
    observation,
    data,
    locationShortname,
    archiveUrlContext,
    ids
) =>
    `<table>` +
    `<tr><th>Identification(s)</th><td>${ids || 'Unidentified'}</td></tr>` +
    `<tr><th>Label</th><td>${data.labelText}</td></tr>` +
    `<tr><th>Frequency Range</th><td>${data.frequencyFloor} - ${
        data.frequencyCeiling
    }</td></tr>` +
    `<tr><th>Local time</th><td>${data.time}</td></tr>` +
    `<tr><th>Location</th><td>${locationShortname}</td></tr>` +
    `<tr><th>Identified by</th><td>${data.submitterName}</td></tr>` +
    `<tr><th>Derived from</th>` +
    `<td><a href="${archiveUrlContext}">HNCSW1_20190216_072003.wav</a></td>` +
    `</tr>` +
    `</table>`;

const getTempPath = () => `${__dirname}/../../temp`;
const getFilePath = filename => `${getTempPath()}/${filename}`;

const clipFile = ({
    filename,
    start,
    duration,
    clipName,
    callback,
    frequencyFloor,
    frequencyCeiling,
    id,
    labelText,
    projectName
}) => {
    sox(
        {
            inputFile: `${getTempPath()}/${filename}.flac`,
            outputFile: `${getTempPath()}/${clipName}.flac`,
            effects: ['trim', getCue(start), duration + durationPadding]
        },
        () => {
            sox(
                {
                    inputFile: `${getTempPath()}/${clipName}.flac`,
                    outputFile: `-n`,
                    effects: [
                        'rate',
                        '22k',
                        'spectrogram',
                        '-o',
                        `${getTempPath()}/${clipName}-spectrogram.png`,
                        '-t',
                        `${fileNameToDateTime({
                            filename,
                            seconds: getCue(start)
                        })} "${trimmedString({
                            string: labelText,
                            length: 36
                        })}" (${projectName}, Observation #${id})`,
                        '-w',
                        'kaiser',
                        '-c',
                        `[generated by ecolore.org]`,
                        '-W',
                        '10',
                        '-Z',
                        '30'
                    ]
                },
                () => {
                    const ffmpegPath = ffmpeg.path;
                    exec(
                        `${ffmpegPath} -i ${getTempPath()}/${clipName}.flac -y -lavfi showspectrumpic=start=${getFrequencyFloor(frequencyFloor)}:stop=${getFrequencyCeiling(
                            { frequencyCeiling, frequencyFloor }
                        ) *
                            1.5}:s=800x600:color=6:gain=0.25 ${getTempPath()}/${clipName}-focused-spectrogram.png`
                    ).then(callback);
                }
            );
        }
    );
};

const getFilenameFromObservation = R.path(['data', 'filename']);

const checkIfFileExists = filename =>
    fs.existsSync(getFilePath(filename + '.flac'));

const clipAudioFile = ({ fileUrl, observation }, callback) =>
    Maybe.of(checkIfFileExists(getFilenameFromObservation(observation))).fork(
        _ => console.error('Error occurred!'),
        fileExists => {
            const project = observation.project;
            const projectSlug = project.get('slug');
            const projectName = project.get('title');
            fs.ensureDirSync(getTempPath());
            return fileExists
                ? clipFile({
                      filename: getFilenameFromObservation(observation),
                      projectName,
                      id: observation.id,
                      labelText: observation.data.labelText,
                      start: Math.floor(observation.data.startTime),
                      duration: Math.ceil(observation.data.duration),
                      clipName: `${projectSlug}-observation-${observation.id}`,
                      frequencyCeiling: Math.ceil(
                          observation.data.frequencyCeiling
                      ),
                      frequencyFloor: Math.floor(
                          observation.data.frequencyFloor
                      ),
                      callback
                  })
                : download({
                      url: `${
                          observation.surveyUrl
                      }${getFilenameFromObservation(observation)}.flac`,
                      dest: `${getTempPath()}/${getFilenameFromObservation(
                          observation
                      )}.flac`,
                      cb: () =>
                          clipFile({
                              filename: getFilenameFromObservation(observation),
                              id: observation.id,
                              projectName,
                              labelText: observation.data.labelText,
                              start: Math.floor(observation.data.startTime),
                              duration: Math.ceil(observation.data.duration),
                              clipName: `${projectSlug}-observation-${
                                  observation.id
                              }`,
                              frequencyCeiling: Math.ceil(
                                  observation.data.frequencyCeiling
                              ),
                              frequencyFloor: Math.floor(
                                  observation.data.frequencyFloor
                              ),
                              callback
                          })
                  });
        }
    );

const getObservationsFromFile = file =>
    findAllObservations({
        where: {
            data: {
                filename: file
            }
        },
        include: [
            {
                model: db.Survey,
                include: [
                    db.Zone,
                    {
                        model: db.Cycle,
                        include: [db.Project]
                    }
                ]
            },
            {
                model: db.Identification,
                include: [db.Identifier],
                where: { invalid: null }
            }
        ]
    });

const clipAudioFileF = Future.encaseN(clipAudioFile);

const flagAcousticFile = (file, callback) => {
    return updateAcousticFile([
        {
            data: R.mergeDeepRight(file.get('data'), {
                derived: { clips: true }
            })
        },
        {
            where: {
                id: file.get('id')
            }
        }
    ]);
};

const clipAcousticFiles = callback =>
    findAllAcousticFiles({
        where: db.Sequelize.literal(
            "json_unquote(json_extract(`AcousticFile`.`data`,'$.derived.clips')) IS NULL " +
                "AND json_unquote(json_extract(`AcousticFile`.`data`,'$.derived.identifications')) IS NOT NULL"
        ),
        limit: deriveAudioFileLimit
    })
        .chain(files => {
            const collectObservations = () =>
                files.map(file =>
                    getObservationsFromFile(file.get('name')).chain(
                        observations => {
                            return flagAcousticFile(file).map(
                                () => observations
                            );
                        }
                    )
                );
            return Future.parallel(1, collectObservations());
        })
        .chain(observationsCollection => {
            const observations = flatten(observationsCollection);
            const deriveClips = () =>
                observations.map(observation => {
                    if (!observation.Survey) {
                        return Future.of(null);
                    }
                    return Future((reject, resolve) => {
                        clipAudioFile(
                            {
                                observation: {
                                    data: observation.data,
                                    id: observation.id,
                                    project: observation.Survey.Cycle.Project,
                                    surveyUrl:
                                        JSON.parse(
                                            observation.Survey.get('data')
                                        ).archive_org_url.replace(
                                            '/details/',
                                            '/download/'
                                        ) + '/'
                                }
                            },
                            () => {
                                createLog({
                                    level: 0,
                                    text: `Created clips for Obs #${
                                        observation.id
                                    }`,
                                    data: {
                                        observation: {
                                            data: observation.data,
                                            id: observation.id,
                                            surveyUrl:
                                                JSON.parse(
                                                    observation.Survey.get(
                                                        'data'
                                                    )
                                                ).archive_org_url.replace(
                                                    '/details/',
                                                    '/download/'
                                                ) + '/'
                                        }
                                    }
                                })
                                    .chain(() => {
                                        const getIds = observation =>
                                            Maybe.of(
                                                observation.Identifications
                                            )
                                                .map(a =>
                                                    a.map(id =>
                                                        id.Identifier
                                                            ? id.Identifier.get(
                                                                  'text'
                                                              )
                                                            : ''
                                                    )
                                                )
                                                .fork(
                                                    _ => 'None',
                                                    a => a.join(', ')
                                                );

                                        const data = observation.get('data');
                                        const surveyData = JSON.parse(
                                            observation.Survey.get('data')
                                        );
                                        const project =
                                            observation.Survey.Cycle.Project;
                                        const projectConfig = JSON.parse(
                                            project.get('config')
                                        );
                                        const projectSlug = project.get('slug');
                                        const projectName = project.get(
                                            'title'
                                        );
                                        const observationId = observation.get(
                                            'id'
                                        );

                                        const locationName = observation.Survey
                                            .Zone
                                            ? observation.Survey.Zone.get(
                                                  'name'
                                              )
                                            : 'Unspecified';

                                        const locationShortname = locationName
                                            .split('--')
                                            .shift();

                                        const locationCode = observation.Survey
                                            .Zone
                                            ? observation.Survey.Zone.get(
                                                  'code'
                                              )
                                            : 'Unspecified';

                                        const archiveUrl =
                                            surveyData.archive_org_url ||
                                            'Unspecified';
                                        const archiveUrlContext =
                                            archiveUrl +
                                            '/' +
                                            data.filename +
                                            `?start=${Math.floor(
                                                data.startTime
                                            )}`;

                                        const ids =
                                            getIds(observation) ||
                                            'Unidentified';

                                        const description = buildObservationTable(
                                            observation,
                                            data,
                                            locationShortname,
                                            archiveUrlContext,
                                            ids
                                        );

                                        const fileData = {
                                            data: {
                                                collection: getCollection(),
                                                creator:
                                                    projectConfig.archiveOrgName ||
                                                    `Hamilton Naturalists' Club`,
                                                date: data.fileDate.substring(
                                                    0,
                                                    10
                                                ),
                                                description: description,
                                                licenseurl:
                                                    'https://creativecommons.org/licenses/by/4.0/',
                                                mediatype: 'audio',
                                                subject: `bioacoustics; ${projectName}, ${getIds(
                                                    observation
                                                )}`,
                                                title: `${projectConfig.obsCode ||
                                                    'Observation'} #${observationId}: ${ids} @ ${locationShortname}, ${
                                                    data.time
                                                }`,
                                                observationId: observationId,
                                                projectName: projectName,
                                                projectSlug: projectSlug,
                                                datetime: data.fileDate,
                                                locationCode: locationCode,
                                                location: locationName,
                                                deviceId: data.deviceId,
                                                filename: data.filename,
                                                archiveUrl: archiveUrl,
                                                archiveUrlContext: archiveUrlContext,
                                                labelText: data.labelText,
                                                identification: ids,
                                                submitterName:
                                                    data.submitterName ||
                                                    'Unspecified',
                                                frequencyFloor:
                                                    data.frequencyFloor || 0,
                                                frequencyCeiling:
                                                    data.frequencyCeiling ||
                                                    Infinity,
                                                duration: data.duration,
                                                clipFilename: `${projectSlug}-observation-${observationId}.flac`
                                            },
                                            filePath: `${getTempPath()}/${projectSlug}-observation-${observationId}.flac`
                                        };

                                        const uploadToArchiveOrgF = Future.encaseP(
                                            a => uploadToArchiveOrg(a)
                                        );

                                        const derivedFiles = [
                                            {
                                                file: `${projectSlug}-observation-${observationId}.flac`,
                                                type: 'clip:audio'
                                            },
                                            {
                                                file: `${projectSlug}-observation-${observationId}-focused-spectrogram.png`,
                                                type: 'clip:focused-spectrogram'
                                            },
                                            {
                                                file: `${projectSlug}-observation-${observationId}-spectrogram.png`,
                                                type: 'clip:spectrogram'
                                            }
                                        ];

                                        return uploadToArchiveOrgF(fileData)
                                            .map(() =>
                                                fs.unlinkSync(
                                                    `${getTempPath()}/${projectSlug}-observation-${observationId}.flac`
                                                )
                                            )
                                            .chain(() =>
                                                uploadToArchiveOrgF(
                                                    R.mergeDeepRight(fileData, {
                                                        data: {
                                                            clipFilename: `${projectSlug}-observation-${observationId}-focused-spectrogram.png`
                                                        },
                                                        filePath: `${getTempPath()}/${projectSlug}-observation-${observationId}-focused-spectrogram.png`
                                                    })
                                                ).map(() =>
                                                    fs.unlinkSync(
                                                        `${getTempPath()}/${projectSlug}-observation-${observationId}-focused-spectrogram.png`
                                                    )
                                                )
                                            )
                                            .chain(() =>
                                                uploadToArchiveOrgF(
                                                    R.mergeDeepRight(fileData, {
                                                        data: {
                                                            clipFilename: `${projectSlug}-observation-${observationId}-spectrogram.png`
                                                        },
                                                        filePath: `${getTempPath()}/${projectSlug}-observation-${observationId}-spectrogram.png`
                                                    })
                                                ).map(() =>
                                                    fs.unlinkSync(
                                                        `${getTempPath()}/${projectSlug}-observation-${observationId}-spectrogram.png`
                                                    )
                                                )
                                            )
                                            .chain(() =>
                                                deleteDerivedFiles({
                                                    where: {
                                                        observationId,
                                                        fileType: {
                                                            [Op.like]: 'clip:%'
                                                        }
                                                    }
                                                })
                                            )
                                            .chain(() =>
                                                createDerivedFiles(
                                                    derivedFiles.map(file => ({
                                                        observationId,
                                                        fileType: file.type,
                                                        url: `https://archive.org/download/${buildBucketName(
                                                            {
                                                                projectSlug,
                                                                observationId
                                                            }
                                                        )}/${file.file}`
                                                    }))
                                                )
                                            );
                                    })
                                    .fork(console.error, resolve);
                            }
                        );
                    });
                });
            return Future.parallel(1, deriveClips());
        })
        .chain(res =>
            createLog({
                level: 0,
                text: 'Uploaded files to archive.org',
                data: res
            })
        )
        .fork(
            err => {
                rimraf(getTempPath(), () => {
                    callback(err);
                });
            },
            () => rimraf(getTempPath(), () => callback())
        );

module.exports = {
    clipAudioFile,
    clipAcousticFiles
};
