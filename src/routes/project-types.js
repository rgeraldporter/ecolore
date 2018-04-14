const renderProjectTypesPage = (res, name, values = {}) =>
    res.render(name, Object.assign(values, { section: 'project-types' }));

module.exports = function(router) {

    router.get('/project-types/turtle-watch', (req, res) => {
        renderProjectTypesPage(res, 'project-types/turtle-watch', { user: res.locals.user });
    });
};