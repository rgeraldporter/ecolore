const passwordless = require('passwordless');

module.exports = function(router) {
    /* GET logout. */
    router.get('/logout', passwordless.logout(), function(req, res) {
        res.redirect('/');
    });
};
