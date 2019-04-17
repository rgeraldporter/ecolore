const db = require('../models/index');
const R = require('ramda');

module.exports = function(router) {
    router.get('/qr/:qrId', function(req, res) {
        db.QrCode.findOne({
            where: { id: req.params.qrId }
        }).then(qr => res.redirect(qr.link));
    });
};
