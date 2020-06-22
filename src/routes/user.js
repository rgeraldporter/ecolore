const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const passwordless = require('passwordless');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Op = db.Sequelize.Op;

const renderUserPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'profile', user: res.locals.user })
    );

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const THIS_HOST = process.env.HOST ? process.env.HOST : 'http://ecolore-local.org:3001';

const findProjectByIdAndOwner = ([id, user]) =>
    db.Project.findOne({
        where: { id },
        include: [
            {
                model: db.Membership,
                where: {
                    userId: user.get('id'),
                    [Op.or]: [{ role: 'owner' }, { role: 'administrator' }]
                }
            }
        ]
    });

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL:
                THIS_HOST +
                '/user/auth/google/drive/callback',
            passReqToCallback: true
        },
        function(request, accessToken, refreshToken, profile, done) {
            process.nextTick(() => {
                const state = request.query.state;

                db.Google_Drive_Project_State.findOne({ token: state })
                    .then(state =>
                        db.Google_Drive_OAuth2_Token.create({
                            projectId: state.get('projectId'),
                            accessToken,
                            refreshToken
                        })
                    )
                    .then(() => done(null, profile));
            });
        }
    )
);

module.exports = router => {
    router.get('/user/auth/google/drive/:state', (req, res, next) =>
        passport.authenticate('google', {
            prompt: 'consent',
            accessType: 'offline',
            scope: ['profile', 'https://www.googleapis.com/auth/drive.file'],
            state: req.params.state
        })(req, res, next)
    );

    router.get(
        '/user/auth/google/drive/callback',
        passwordless.restricted({failureRedirect: '/login' }),
        (req, res, next) => {
            const state = req.query.state;
            db.Google_Drive_Project_State.findOne({ token: state })
                .then(state =>
                    findProjectByIdAndOwner([
                        state.projectId,
                        res.locals.user
                    ]).then(project => {
                        console.log('got a project', state, project);
                        return passport.authenticate('google', {
                            successRedirect:
                                '/project/' + project.slug + '/edit',
                            failureRedirect: '/user/auth/google/drive/failure',
                            scope: [
                                'profile',
                                'https://www.googleapis.com/auth/drive.file'
                            ]
                        })(req, res, next);
                    })
                )
                .catch(err => res.render('error'));
        }
    );

    router.get(
        'user/auth/google/failure',
        passwordless.restricted({failureRedirect: '/login' }),
        (req, res) => {
            res.render('google-failure');
        }
    );

    router.post(
        '/user/:id',
        [
            check('email')
                .isEmail()
                .withMessage('must be a valid email address')
                .trim()
                .normalizeEmail(),
            check('firstName').exists(),
            check('lastName').exists(),
            check('bio').exists(),
            passwordless.restricted({failureRedirect: '/login' })
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                db.User.findByPk(req.user.id).then(user =>
                    renderUserPage(res, 'registration', { user })
                );
            } else {
                const userUpdate = matchedData(req);
                db.User.update(userUpdate, { where: { id: req.params.id } })
                    .then(() => db.User.findByPk(req.params.id))
                    .then(user => res.redirect('/profile'))
                    .catch(err => console.error(err));
            }
        }
    );
};
