const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const fs = require('fs-extra');
const isViewFile = path => fs.existsSync(__dirname + '/../views/' + path);
const {
    parseProject,
    parseMembership
} = require('../../helpers/project-helper');

const getObservationTemplatePath = project =>
    isViewFile(`forms/custom/${project.get('slug')}-observation.ejs`)
        ? `forms/custom/${project.get('slug')}-observation.ejs`
        : `forms/project-model/${project.get('model')}-observation.ejs`;

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));
const findOneSurvey = Future.encaseP(a => db.Survey.findOne(a));

const findSurveyByCycleAndId = ([cycleId, id]) =>
    findOneSurvey({
        attributes: {
            include: [
                [
                    db.Sequelize.fn(
                        'COUNT',
                        db.Sequelize.col('Observations.id')
                    ),
                    'observationCount'
                ],
                [
                    db.Sequelize.fn('COUNT', db.Sequelize.col('Reviews.id')),
                    'reviewCount'
                ]
            ]
        },
        where: { cycleId, id },
        include: [
            {
                model: db.Cycle,
                include: [db.Project]
            },
            db.Observation,
            db.Review,
            db.Zone
        ]
    });

const findUserAsContributorOfProject = ([email, project, required = true]) =>
    findOneUser({
        where: { email },
        include: [
            {
                model: db.Membership,
                where: {
                    projectId: project.id,
                    role: ['administrator', 'owner', 'contributor']
                },
                required
            }
        ]
    });

const findProjectBySlug = slug =>
    findOneProject({
        where: { slug },
        include: [{ model: db.Cycle, order: [['start', 'DESC']] }]
    });

const findContributorBySlug = ({ slug, userEmail }) =>
    findProjectBySlug(slug)
        .chain(project =>
            Future.both(
                Future.of(project),
                findUserAsContributorOfProject([userEmail, project, false])
            )
        )
        .map(([project, user]) =>
            Object.assign(project, {
                membership: parseMembership(user)
            })
        );

const newObservationRouter = (req, res, next) =>
    // must be a contributor or higher to project (by slug)
    findContributorBySlug({
        slug: req.params.slug,
        userEmail: req.user
    })
        // get survey data, ensure it is part of the cycle
        .chain(project =>
            Future.both(
                Future.of(project),
                findSurveyByCycleAndId([
                    req.params.cycleId,
                    req.params.surveyId
                ])
            )
        )
        // verify it is part of the correct project
        .chain(([project, survey]) =>
            R.pathOr(Symbol('nonce'), ['Cycle', 'Project', 'id'], survey) !==
            project.get('id')
                ? Future.reject('Survey not part of this project')
                : Future.of({ project, survey })
        )
        .fork(
            _ => res.redirect(`/project/${req.params.slug}`),
            ({ project, survey }) =>
                res.render(getObservationTemplatePath(project), {
                    project: parseProject(project),
                    cycle: { id: req.params.cycleId },
                    // might only need `survey` as the rest should be accessible under it
                    survey,
                    from: req.query.from || false,
                    fromNewSurvey: req.query.fromNewSurvey || false,
                    section: 'project',
                    user: res.locals.user
                })
        );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observation/new',
        passwordless.restricted({ failureRedirect: '/login' }),
        newObservationRouter
    );
};
