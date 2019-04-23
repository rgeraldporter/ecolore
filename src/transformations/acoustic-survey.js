const multer = require('multer');
const db = require('../models/index');
const os = require('os');
const fs = require('fs');
const labels = require('audacity-labels');
const R = require('ramda');
const moment = require('moment');

const upload = multer({ dest: os.tmpdir() });

const observation = (req, res, next) =>
    upload.array('labelfiles')(req, res, () => {
        const files = Array.from(req.files);
        req.body.observations = [];
        req.body.filenames = [];

        files.forEach(file => {
            const content = fs.readFileSync(file.path, 'utf8');
            const filename = file.originalname.slice(0, -4);
            const fileDate = moment(
                filename.split('_')[1] + filename.split('_')[2],
                'YYYYMMDDHHmmss'
            ).format('YYYY-MM-DD HH:mm:ss');
            const deviceId = filename.split('_')[0];
            const observations = labels
                .parse(content)
                .join()
                .map(label =>
                    Object.assign(label, {
                        fileDate,
                        filename,
                        deviceId,
                        time: moment(fileDate)
                            .add(label.startTime, 'seconds')
                            .format('YYYY-MM-DD HH:mm:ss.SSS'),
                        duration: label.endTime - label.startTime,
                        submitterName:
                            res.locals.user.firstName +
                            ' ' +
                            res.locals.user.lastName
                    })
                );
            req.body.observations.push(observations);
            req.body.filenames.push(file.originalname);
        });

        const filenames = req.body.filenames;
        const surveyId = req.body.survey;
        const cycleId = req.body.cycle;

        const whereRemaining = ([priority, nullFile]) =>
            priority
                ? {
                      name: nullFile.get('name'),
                      reviewed: false,
                      priority: true
                  }
                : {
                      name: nullFile.get('name'),
                      reviewed: false
                  };

        // validate these are the right files for this survey
        // and nullify files that remain if that option was checked
        db.AcousticFile.findAll({
            where: {
                surveyId
            }
        })
            .then(acousticFiles => [
                acousticFiles,
                acousticFiles.filter(
                    acousticFile =>
                        !filenames.includes(acousticFile.get('name') + '.txt')
                )
            ])
            .then(([acousticFiles, remaining]) =>
                req.body.nullify_remaining ||
                req.body.nullify_priority_remaining
                    ? Promise.all(
                          remaining.map(nullFile =>
                              db.AcousticFile.update(
                                  {
                                      data: {
                                          nullFile: true
                                      },
                                      reviewed: req.body.scanned ? false : true,
                                      scanned: req.body.scanned ? true : false
                                  },
                                  {
                                      where: whereRemaining(
                                          [req.body.nullify_priority_remaining, nullFile]
                                      )
                                  }
                              )
                          )
                      ).then(() => acousticFiles)
                    : acousticFiles
            )
            .then(acousticFiles =>
                // get just the filenames
                acousticFiles.map(acousticFiles => acousticFiles.get('name'))
            )
            .then(acousticFiles =>
                filenames.filter(
                    filename => !acousticFiles.includes(filename.slice(0, -4))
                )
            )
            .then(invalidFiles =>
                invalidFiles.length
                    ? Promise.reject(invalidFiles)
                    : Promise.resolve()
            )
            .catch(invalidFiles =>
                res.redirect(
                    '/project/' +
                        req.params.slug +
                        '/cycle/' +
                        cycleId +
                        '/survey/' +
                        surveyId +
                        '/observation/new?invalid=' +
                        encodeURI(invalidFiles.join(', '))
                )
            )
            .then(() => next());
    });

module.exports = { observation };
