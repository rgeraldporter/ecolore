const R = require('ramda');

const rolePath = R.lensPath(['Memberships', 0, 'role']);
const sincePath = R.lensPath(['Memberships', 0, 'createdAt']);
const parseMembership = val => ({
    role: R.view(rolePath, val) || 'none',
    since: R.view(sincePath, val) || null
});

const parseProjectAndMemberships = project => ({
    id: project.get('id'),
    title: project.get('title'),
    slug: project.get('slug'),
    model: project.get('model'),
    location: project.get('location'),
    description: project.get('description'),
    url: project.get('url'),
    initialYear: project.get('initialYear'),
    status: project.get('status'),
    public: project.get('public'),
    config: project.get('config'),
    memberSince: R.propOr('none', 'since', parseMembership(project)),
    memberRole: R.propOr('none', 'role', parseMembership(project))
});

const parseProject = project => ({
    id: project.get('id'),
    title: project.get('title'),
    slug: project.get('slug'),
    model: project.get('model'),
    location: project.get('location'),
    description: project.get('description'),
    url: project.get('url'),
    initialYear: project.get('initialYear'),
    status: project.get('status'),
    public: project.get('public'),
    config: project.get('config'),
    memberSince: R.pathOr(null, ['membership', 'since'], project),
    memberRole: R.pathOr('none', ['membership', 'role'], project),
    Cycles: project.get('Cycles')
});

module.exports = { parseProject, parseMembership, parseProjectAndMemberships };
