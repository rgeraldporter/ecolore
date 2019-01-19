const multer = require('multer');
const os = require('os');
const fs = require('fs');
const labels = require('audacity-labels');
const R = require('ramda');
const moment = require('moment');

const upload = multer({ dest: os.tmpdir() });

const observation = (req, res, next) => {
    upload.array('labelfiles')(req, res, () => {
        const files = req.files;
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
        next();
    });
};

module.exports = { observation };
