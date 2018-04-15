const passwordless = require('passwordless');

const renderIndexPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'index' }));

module.exports = function(router) {
    router.post(
        '/sendtoken',
        passwordless.requestToken(
            function(user, delivery, callback, req) {
                callback(null, user);
            }
        ),
        function(req, res, next) {
            renderIndexPage(res, 'sent');
        }
    );
};
