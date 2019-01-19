const renderIndexPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'index' }));

module.exports = function(router) {
    /* GET home page. */
    router.get('/', function(req, res) {
        renderIndexPage(res, 'index', { user: res.locals.user });
    });

    router.get('/about', (req, res) => {
        renderIndexPage(res, 'about', { user: res.locals.user });
    });

    router.get('/release-notes/:version', (req, res) => {
        renderIndexPage(res, `release-notes/${req.params.version}.notes.ejs`, { user: res.locals.user });
    });
};