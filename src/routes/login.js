const renderLoginPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'login' }));

module.exports = function(router) {
    /* GET login screen. */
    router.get('/login', function(req, res) {
        renderLoginPage(res, 'login', { user: res.locals.user });
    });
};
