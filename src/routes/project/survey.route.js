const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const fs = require('fs-extra');
const convert = require('xml-js');
const xml = require('xml');
const t = require('../../helpers/text').text;
const csv = require('csv-express');
const isViewFile = path => fs.existsSync(__dirname + '/../views/' + path);
const {
    parseProject,
    parseMembership,
    parseProjectAndMemberships
} = require('../../helpers/project-helper');

const { surveyDataTable } = require('../../datatables/survey.dt');

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));
const findOneCycle = Future.encaseP(a => db.Cycle.findOne(a));
const findAllSurvey = Future.encaseP(a => db.Survey.findAll(a));
const findOneSurvey = Future.encaseP(a => db.Survey.findOne(a));
const findAllZone = Future.encaseP(a => db.Zone.findAll(a));

const renderProjectTemplate = project =>
    project ? { project: parseProject(project) } : { project: {} };

const getStandardSurveyForm = project =>
    isViewFile(`forms/custom/${project.get('slug')}-survey.ejs`)
        ? `forms/custom/${project.get('slug')}-survey.ejs`
        : `forms/project-model/${project.get('model')}-survey.ejs`;

const getSurveyFormByName = ([project, formName]) =>
    isViewFile(`forms/custom/${project.get('slug')}-survey-${formName}.ejs`)
        ? `forms/custom/${project.get('slug')}-survey-${formName}.ejs`
        : `forms/project-model/${project.get('model')}-survey-${formName}.ejs`;

const surveyTemplate = ([project, getParams]) =>
    R.propOr(false, 'form', getParams)
        ? getSurveyFormByName([project, getParams.form])
        : getStandardSurveyForm(project);

const renderProjectMembershipsTemplate = project =>
    project
        ? { project: parseProjectAndMemberships(project) }
        : { project: {} };

const renderProjectPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

const isContributorOfProject = project =>
    ['administrator', 'owner', 'contributor'].includes(
        R.path(['membership', 'role'], project)
    );

const findUserAsMemberOfProjectByIdF = ([userId, project, required = true]) =>
    findOneUser({
        where: { id: userId },
        include: [
            {
                model: db.Membership,
                where: { projectId: project.id },
                required
            }
        ]
    });

const findSurveyByCycleAndIdWithUser = ([cycleId, id, userId]) =>
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
                // https://stackoverflow.com/questions/33900750/sequelize-order-by-count-association/36852571#36852571
                // cannot use same pattern as above, gives duplicate result.
                [
                    db.Sequelize.literal(
                        '(SELECT COUNT(*) FROM Reviews WHERE Reviews.surveyId = Survey.id)'
                    ),
                    'reviewCount'
                ],
                [
                    db.Sequelize.literal(
                        '(SELECT COUNT(*) FROM Assignments WHERE Assignments.surveyId = Survey.id)'
                    ),
                    'assignmentCount'
                ]
            ]
        },
        where: { cycleId, id },
        include: [
            {
                model: db.Cycle,
                include: [
                    {
                        model: db.Project,
                        include: [
                            {
                                model: db.Membership,
                                where: {
                                    userId
                                }
                            }
                        ]
                    }
                ]
            },
            db.Observation,
            db.Review,
            db.Zone,
            db.Assignment
        ]
    });

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

const surveyEndpoint = (req, res) =>
    findSurveyByCycleAndIdWithUser([
        req.params.id,
        req.params.surveyId,
        res.locals.user.id
    ])
        .chain(survey =>
            Future.both(
                Future.of(survey),
                findUserAsMemberOfProjectByIdF([
                    res.locals.user.id,
                    survey.Cycle.Project,
                    true
                ])
            )
        )
        // verify it is part of the correct project
        .chain(([survey, membership]) =>
            R.pathOr(Symbol('nonce'), ['Cycle', 'Project', 'slug'], survey) !==
            req.params.slug
                ? Future.reject('Survey not part of this project')
                : Future.of([survey, membership])
        )
        .chain(([survey, membership]) =>
            membership
                ? Future.of([survey, membership])
                : Future.reject('You are not a member of this project')
        );

const getSurvey = (req, res, review) =>
    surveyEndpoint(req, res).fork(
        _ => {
            console.error(_);
            return res.redirect(`/project/${req.params.slug}`);
        },
        ([survey, membership]) =>
            renderProjectPage(
                res,
                'survey',
                Object.assign(
                    {
                        survey,
                        review,
                        urlPath: req.path,
                        dt: surveyDataTable({
                            survey,
                            projectSlug: req.params.slug,
                            project: survey.Cycle.Project,
                            req,
                            review
                        })
                    },
                    renderProjectMembershipsTemplate(survey.Cycle.Project)
                )
            )
    );

const getSurveyCsv = (req, res, review) =>
    surveyEndpoint(req, res).fork(
        _ => {
            console.error(_);
            return res.redirect(`/project/${req.params.slug}`);
        },
        ([survey, membership]) =>
            surveyDataTable({
                survey,
                projectSlug: req.params.slug,
                project: survey.Cycle.Project,
                req,
                review
            }).chain(table => {
                res.csv(table, true, {
                    'Content-disposition': `attachment; filename=${
                        req.params.slug
                    }_${t('survey', survey.Cycle.Project)}-${survey.id}.csv`,
                    'Content-Type': 'text/csv'
                });
            })
    );

const getSurveyJson = (req, res, review) =>
    surveyEndpoint(req, res).fork(
        _ => {
            console.error(_);
            return res.redirect(`/project/${req.params.slug}`);
        },
        ([survey, membership]) =>
            res.json(
                surveyDataTable({
                    survey,
                    projectSlug: req.params.slug,
                    project: survey.Cycle.Project,
                    req,
                    review
                }).obj()
            )
    );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycle/:id/survey/new',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    isContributorOfProject(project)
                        ? Future.of(project)
                        : Future.reject(
                              'You are either not a member of this project or not a contributor'
                          )
                )
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findAllZone({
                            where: { projectId: project.id },
                            order: [['code', 'ASC']]
                        })
                    )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, zones]) =>
                        renderProjectPage(
                            res,
                            surveyTemplate([project, req.query]),
                            Object.assign(renderProjectTemplate(project), {
                                cycle: { id: req.params.id },
                                zones,
                                from: req.query.from || false
                            })
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getSurvey(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getSurveyCsv(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getSurveyJson(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/review',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getSurvey(req, res, true)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getSurveyCsv(req, res, false)
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) => getSurveyJson(req, res, false)
    );
};
