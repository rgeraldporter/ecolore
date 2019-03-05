const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const fs = require('fs-extra');
const isViewFile = path => fs.existsSync(__dirname + '/../../views/' + path);
const t = require('../../helpers/text').text;
const {
    parseProject,
    parseMembership
} = require('../../helpers/project-helper');

const { csvHeader } = require('../../helpers/csv-helper');
const { observationDataTable } = require('../../datatables/observation.dt');

const renderProjectTemplate = project =>
    project ? { project: parseProject(project) } : { project: {} };

// @todo test for template path!
const getObservationTemplatePath = project =>
    isViewFile(`forms/custom/${project.get('slug')}-observation.ejs`)
        ? `forms/custom/${project.get('slug')}-observation.ejs`
        : `forms/project-model/${project.get('model')}-observation.ejs`;

const isMemberOfProject = project =>
    R.path(['membership', 'role'], project) !== 'none';

const renderProjectPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));
const findOneSurvey = Future.encaseP(a => db.Survey.findOne(a));
const findOneObservation = Future.encaseP(a => db.Observation.findOne(a));
const findAllDerivedFiles = Future.encaseP(a => db.DerivedFile.findAll(a));

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
                    db.Sequelize.literal(
                        '(SELECT COUNT(*) FROM Reviews WHERE Reviews.surveyId = Survey.id)'
                    ),
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

const findProjectBySlugF = slug =>
    findOneProject({
        where: { slug },
        include: [{ model: db.Cycle, order: [['start', 'DESC']] }]
    });

const findUserAsMemberOfProjectF = ([email, project, required = true]) =>
    findOneUser({
        where: { email },
        include: [
            {
                model: db.Membership,
                where: { projectId: R.prop('id', project) },
                required
            }
        ]
    });

const findMemberBySlugF = ([slug, userEmail]) =>
    findProjectBySlugF(slug)
        .chain(project =>
            Future.both(
                Future.of(project),
                findUserAsMemberOfProjectF([userEmail, project, false])
            )
        )
        .map(([project, user]) =>
            Object.assign(project, {
                membership: parseMembership(user)
            })
        );

const findObservationBySurveyAndIdWithFiles = ([surveyId, id]) =>
    findOneObservation({
        where: {
            surveyId,
            id
        },
        attributes: {
            include: [
                [
                    db.Sequelize.fn('COUNT', db.Sequelize.col('Files.id')),
                    'fileCount'
                ],
                [
                    db.Sequelize.fn('COUNT', db.Sequelize.col('Reviews.id')),
                    'reviewCount'
                ]
            ]
        },
        include: [
            {
                model: db.Survey,
                include: [
                    {
                        model: db.Cycle,
                        include: [db.Project]
                    }
                ]
            },
            {
                model: db.Identification,
                include: [
                    {
                        model: db.Identifier
                    }
                ]
            },
            db.File,
            db.Review
        ]
    });

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

const observationEndpoint = (req, res) =>
    findMemberBySlugF([req.params.slug, req.user])
        .chain(project =>
            Future.both(
                Future.of(project),
                findObservationBySurveyAndIdWithFiles([
                    req.params.surveyId,
                    req.params.observationId
                ])
            )
        )
        .chain(([project, observation]) =>
            isMemberOfProject(project)
                ? Future.of([project, observation])
                : Future.reject('Not a member of this project')
        )
        .chain(([project, observation]) =>
            findAllDerivedFiles({
                where: { observationId: observation.get('id') }
            }).chain(derivedFiles =>
                Future.of([derivedFiles, project, observation])
            )
        );
const getObservation = (req, res, review) =>
    observationEndpoint(req, res).fork(
        _ => res.redirect(`/project/${req.params.slug}`),
        ([derivedFiles, project, observation]) =>
            renderProjectPage(
                res,
                'observation',
                Object.assign(
                    {
                        cycleId: req.params.id,
                        projectSlug: req.params.slug,
                        observation,
                        review,
                        urlPath: req.path,
                        dt: observationDataTable({
                            observation,
                            projectSlug: req.params.slug,
                            project,
                            req,
                            review,
                            derivedFiles
                        })
                    },
                    renderProjectTemplate(project)
                )
            )
    );

const getObservationJson = (req, res, review) =>
    observationEndpoint(req, res).fork(
        _ => res.redirect(`/project/${req.params.slug}`),
        ([project, observation]) =>
            res.json(
                observationDataTable({
                    observation,
                    projectSlug: req.params.slug,
                    project,
                    req,
                    review
                }).obj()
            )
    );

const getObservationCsv = (req, res, review) =>
    observationEndpoint(req, res).fork(
        _ => res.redirect(`/project/${req.params.slug}`),
        ([project, observation]) =>
            observationDataTable({
                observation,
                projectSlug: req.params.slug,
                project,
                req,
                review
            }).chain(table => {
                res.csv(
                    table,
                    true,
                    csvHeader(
                        `${req.params.slug}_${t('observation', project)}-${
                            observation.id
                        }`
                    )
                );
            })
    );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observation/new',
        passwordless.restricted({ failureRedirect: '/login' }),
        newObservationRouter
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getObservation(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getObservationCsv(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getObservationJson(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/review',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getObservation(req, res, true)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/review/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getObservationCsv(req, res, true)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/review/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getObservationJson(req, res, true)
    );
};
