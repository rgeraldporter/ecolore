const passwordless = require('passwordless');
const db = require('../models/index');
const R = require('ramda');
const Promise = require('bluebird');

const renderProfilePage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'profile', user: res.locals.user })
    );

module.exports = function(router) {
    router.get(
        '/profile/edit',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => {
            db.User.findOne({ where: { email: req.user } }).then(user =>
                renderProfilePage(res, 'registration', {
                    user: {
                        email: user.get('email'),
                        firstName: user.get('firstName'),
                        lastName: user.get('lastName'),
                        bio: user.get('bio'),
                        id: user.get('id')
                    }
                })
            );
        }
    );

    router.get(
        '/profile',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => {
            const registration = user =>
                renderProfilePage(res, 'registration', { user });
            const goToProfile = user =>
                renderProfilePage(res, 'profile', { user });
            const firstNameLensPath = R.lensPath([0, 'firstName']);
            const sessionUser = user => (res.locals.user = user.dataValues);
            const addInvitations = user => {
                const remapInvites = invite =>
                    db.Membership.create({
                        role: invite.role,
                        userId: user.id,
                        projectId: invite.projectId
                    });

                return db.Invite.findAll({
                    where: {
                        email: user.email
                    }
                })
                    .then(invites => Promise.map(invites, remapInvites))
                    .then(() => db.Invite.destroy({
                        where: {
                            email: user.email
                        }
                    }))
                    .catch(console.error)
                    .finally(() => user);
            };

            const createUser = email =>
                db.sequelize
                    .transaction(t => db.User.create({ email }))
                    .then(sessionUser)
                    .then(addInvitations)
                    .then(registration);

            const hasFullAccount = R.pipe(
                R.head,
                R.tap(sessionUser),
                goToProfile
            );

            const hasIncompleteAccount = R.pipe(
                R.head,
                R.tap(sessionUser),
                registration
            );

            const isNewAccount = () => createUser(req.user);

            db.User.findAll({
                where: {
                    email: req.user
                }
            })
                .then(
                    R.cond([
                        [R.view(firstNameLensPath), hasFullAccount],
                        [R.length, hasIncompleteAccount],
                        [R.T, isNewAccount]
                    ])
                )
                .then(() => {
                    console.error('req.user', req.user);
                });
        }
    );
};
