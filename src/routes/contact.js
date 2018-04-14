const renderContactPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'contact' }));

module.exports = function(router) {
    router.get('/contact', function(req, res) {
        renderContactPage(res, 'index', { user: res.locals.user });
    });
};