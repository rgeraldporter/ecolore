const passwordless = require('passwordless');

const renderIndexPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'index' }));

module.exports = function(router) {
    /* POST login screen. */
    router.post(
        '/sendtoken',
        passwordless.requestToken(
            // Simply accept every user
            function(user, delivery, callback, req) {
                callback(null, user);
                // usually you would want something like:
                // User.find({email: user}, callback(ret) {
                // 		if(ret)
                // 			callback(null, ret.id)
                // 		else
                // 			callback(null, null)
                // })
            }
        ),
        function(req, res, next) {
            renderIndexPage(res, 'sent');
        }
    );
};
