const R = require('ramda');

module.exports = {
    text: (key, project) => {
        const config = typeof project.config === 'string' ? JSON.parse(project.config) : project.config;
        return R.pathOr(key, ['language', key], config);
    }
};
