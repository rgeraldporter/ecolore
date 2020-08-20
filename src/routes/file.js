const passwordless = require('passwordless');
const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const express = require('express');
const app = express();
const multer = require('multer');
const { google } = require('googleapis');
const gapis = require('googleapis');
const fs = require('fs');
const os = require('os');
const uuid = require('uuid');
const path = require('path');
const Promise = require('bluebird');

const client = () =>
    new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        (process.env.HOST || 'http://ecolore-local.org:3001') +
            '/user/auth/google/drive/callback'
    );

const projectFolderQuery = (projectName) =>
    `name='EcoLore Project - ${projectName}' and mimeType='application/vnd.google-apps.folder'`;

const cycleFolderQuery = ([projectFolderId, cycleName]) =>
    `'${projectFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${cycleName}'`;

const surveyFolderQuery = ([cycleFolderId, surveyId]) =>
    `'${cycleFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='Survey #${surveyId}'`;

const observationFolderQuery = ([surveyFolderId, observationId]) =>
    `'${surveyFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='Observation #${observationId}'`;

const upload = multer({ dest: os.tmpdir() });

const renderFilePage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

module.exports = function (router) {
    router.post('/file/upload', upload.single('photo'), (req, res) => {
        const errors = validationResult(req);

        const photoData = {
            photo: req.file,
            label: req.body.label,
            observation: req.body.observation,
        };

        if (!photoData.photo) {
            return res.status(400).send('No files were uploaded.');
        }
        // @todo: handle errors better
        if (!errors.isEmpty()) {
            return renderProjectPage(res, 'zone-create');
        }

        const oauth2Client = client();

        db.Observation.findOne({
            where: {
                id: photoData.observation,
            },
            include: [
                {
                    model: db.Survey,
                    include: [
                        {
                            model: db.Cycle,
                            include: [db.Project],
                        },
                    ],
                },
            ],
        }).then((observation) => {
            const drive = google.drive({
                version: 'v3',
                auth: oauth2Client,
            });

            db.Google_Drive_OAuth2_Token.findOne({
                where: {
                    projectId: observation.Survey.Cycle.Project.id,
                },
            }).then((token) => {
                oauth2Client.setCredentials({
                    access_token: token.get('accessToken'),
                    refresh_token: token.get('refreshToken'),
                });

                const getGoogleDriveFolderId = (opts) =>
                    new Promise((resolve, reject) =>
                        drive.files.list(opts, (err, response) =>
                            err ? reject(err) : resolve(response)
                        )
                    );

                const createGoogleDriveFile = (opts) =>
                    new Promise((resolve, reject) =>
                        drive.files.create(opts, (err, response) =>
                            err ? reject(err) : resolve(response)
                        )
                    );

                const createProjectFolder = () =>
                    new Promise((resolve, reject) =>
                        drive.files.create(
                            {
                                resource: {
                                    name:
                                        'EcoLore Project - ' +
                                        observation.Survey.Cycle.Project.title,
                                    mimeType:
                                        'application/vnd.google-apps.folder',
                                },
                                fields: 'id',
                            },
                            (err, response) =>
                                err
                                    ? reject(err)
                                    : resolve(R.path(['data', 'id'], response))
                        )
                    );

                const createCycleFolder = (projectFolderId) =>
                    new Promise((resolve, reject) =>
                        drive.files.create(
                            {
                                resource: {
                                    name: observation.Survey.Cycle.title,
                                    mimeType:
                                        'application/vnd.google-apps.folder',
                                    parents: [projectFolderId],
                                },
                                fields: 'id',
                            },
                            (err, response) =>
                                err
                                    ? reject(err)
                                    : resolve(R.path(['data', 'id'], response))
                        )
                    );

                const createSurveyFolder = (cycleFolderId) =>
                    new Promise((resolve, reject) =>
                        drive.files.create(
                            {
                                resource: {
                                    name: 'Survey #' + observation.Survey.id,
                                    mimeType:
                                        'application/vnd.google-apps.folder',
                                    parents: [cycleFolderId],
                                },
                                fields: 'id',
                            },
                            (err, response) =>
                                err
                                    ? reject(err)
                                    : resolve(R.path(['data', 'id'], response))
                        )
                    );

                const createObservationFolder = (surveyFolderId) =>
                    new Promise((resolve, reject) =>
                        drive.files.create(
                            {
                                resource: {
                                    name: 'Observation #' + observation.id,
                                    mimeType:
                                        'application/vnd.google-apps.folder',
                                    parents: [surveyFolderId],
                                },
                                fields: 'id',
                            },
                            (err, response) =>
                                err
                                    ? reject(err)
                                    : resolve(R.path(['data', 'id'], response))
                        )
                    );

                const parseFolderId = (results) =>
                    results.data.files.length === 0
                        ? Promise.reject()
                        : Promise.resolve(results.data.files[0].id);

                console.log('SEEKING', observation.Survey.Cycle.Project.title);
                Promise.try(() =>
                    getGoogleDriveFolderId({
                        q: projectFolderQuery(
                            observation.Survey.Cycle.Project.title
                        ),
                        fields: 'files(id, name)',
                        spaces: 'drive',
                    })
                )
                    .then(parseFolderId)
                    .catch(createProjectFolder)
                    .then((projectFolderId) =>
                        getGoogleDriveFolderId({
                            q: cycleFolderQuery([
                                projectFolderId,
                                observation.Survey.Cycle.title,
                            ]),
                            fields: 'files(id, name)',
                            spaces: 'drive',
                        })
                            .then(parseFolderId)
                            .catch(() => createCycleFolder(projectFolderId))
                    )
                    .then((cycleFolderId) =>
                        getGoogleDriveFolderId({
                            q: surveyFolderQuery([
                                cycleFolderId,
                                observation.Survey.id,
                            ]),
                            fields: 'files(id, name)',
                            spaces: 'drive',
                        })
                            .then(parseFolderId)
                            .catch(() => createSurveyFolder(cycleFolderId))
                    )
                    .then((surveyFolderId) =>
                        getGoogleDriveFolderId({
                            q: observationFolderQuery([
                                surveyFolderId,
                                observation.Survey.id,
                            ]),
                            fields: 'files(id, name)',
                            spaces: 'drive',
                        })
                            .then(parseFolderId)
                            .catch(() =>
                                createObservationFolder(surveyFolderId)
                            )
                    )
                    .then((observationFolderId) =>
                        createGoogleDriveFile({
                            resource: {
                                name: photoData.photo.originalname,
                                parents: [observationFolderId],
                            },
                            media: {
                                mimeType: photoData.photo.mimetype,
                                body: fs.createReadStream(photoData.photo.path),
                            },
                        })
                    )
                    .then((file) =>
                        db.File.create({
                            url: `https://drive.google.com/file/d/${file.data.id}/view`,
                            label: photoData.label,
                            public: 0,
                            uploaderId: res.locals.user.id,
                            observationId: observation.id,
                        })
                    )
                    .then((file) =>
                        renderFilePage(res, 'google-drive/upload-photo', {
                            url: file.get('url'),
                            observationId: req.body.observation,
                            projectSlug: req.body.project,
                            surveyId: req.body.survey,
                            cycleId: req.body.cycle,
                        })
                    )
                    .catch((err) => {
                        console.error('FILE UPLOAD ERROR', err);
                    });
            });
        });
    });
};
