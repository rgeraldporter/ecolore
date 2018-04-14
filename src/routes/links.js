const renderLinksPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'index' }));

module.exports = function(router) {
    /* GET home page. */
    router.get('/links', function(req, res) {
        renderLinksPage(res, 'index', { user: res.locals.user });
    });
};