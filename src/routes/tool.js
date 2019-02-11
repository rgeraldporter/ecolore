const histogramr = require('ebird-histogramr');
const cbcParse = require('audubon-cbc-csv-parser');
const cbcCsv = require('audubon-cbc-csv');
const defaultCsvFn = cbcCsv.createCountCsv;
const csv = require('csv-express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const moment = require('moment');

const upload = multer({ dest: os.tmpdir() });

const renderToolsPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'tool' }));

module.exports = function(router) {
    router.get('/tools', (req, res) => {
        renderToolsPage(res, 'tools', { user: res.locals.user });
    });

    router.get('/tools/cbc-csv', (req, res) => {
        renderToolsPage(res, 'forms/tools/cbc-csv', {
            user: res.locals.user,
            error: req.query.error
        });
    });

    router.post('/tools/cbc-csv', upload.single('cbccsv'), (req, res) => {
        try {
            const file = req.file;
            const reverse = req.body.reverse;
            const countData = cbcParse.default(file.path);
            const filename = file.originalname.slice(0, -4) + '-simplified';
            const newCsv = reverse
                ? cbcCsv.createCountReverseCsv
                : defaultCsvFn(countData);
            res.attachment(`${filename}.csv`);
            res.status(200).send(newCsv);
        } catch (err) {
            res.redirect('/tools/cbc-csv?error=1');
        }
    });

    router.get('/tools/ebird-histogramr', (req, res) => {
        renderToolsPage(res, 'forms/tools/ebird-histogramr', {
            user: res.locals.user,
            error: req.query.error
        });
    });

    router.post(
        '/tools/ebird-histogramr',
        upload.single('histogram'),
        (req, res) => {
            try {
                const file = req.file;
                const content = fs.readFileSync(file.path, 'utf8');
                const filename = file.originalname.slice(0, -4);
                const histogram = histogramr.default(content).emit().allCsv;
                //console.log('his', histogram);
                res.attachment(`${filename}.csv`);
                res.status(200).send(histogram);
            } catch (err) {
                res.redirect('/tools/cbc-csv?error=1');
            }
        }
    );
};
