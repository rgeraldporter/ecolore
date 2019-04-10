const renderProjectTypesPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'project-types' }));

module.exports = function(router) {

    router.get('/project-types/turtle-watch', (req, res) => {
        renderProjectTypesPage(res, 'project-types/turtle-watch', { user: res.locals.user });
    });

    router.get('/project-types/acoustic-survey', (req, res) => {
        renderProjectTypesPage(res, 'project-types/acoustic-survey', { user: res.locals.user });
    });

    router.get('/project-types/birdbox', (req, res) => {
        renderProjectTypesPage(res, 'project-types/birdbox', { user: res.locals.user });
    });
};