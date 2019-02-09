const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const fs = require('fs-extra');
const convert = require('xml-js');
const xml = require('xml');
const t = require('../../helpers/text').text;
const { DataTable } = require('datatable-monad');
const csv = require('csv-express');
const isViewFile = path => fs.existsSync(__dirname + '/../views/' + path);
const {
    parseProject,
    parseMembership
} = require('../../helpers/project-helper');

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));
const findOneCycle = Future.encaseP(a => db.Cycle.findOne(a));
const findAllSurvey = Future.encaseP(a => db.Survey.findAll(a));

const { surveysDataTable } = require('../../datatables/surveys.dt');

const renderProjectPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

const renderProjectTemplate = project =>
    project ? { project: parseProject(project) } : { project: {} };

const isMemberOfProject = project =>
    R.path(['membership', 'role'], project) !== 'none';

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

const findCycleByIdF = id =>
    findOneCycle({
        where: { id },
        include: [db.Project]
    });

const findSurveysByCycle = cycle =>
    findAllSurvey({
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
        include: [
            db.Observation,
            db.Review,
            db.Zone,
            {
                model: db.User,
                as: 'author'
            }
        ],
        where: {
            cycleId: cycle,
            invalid: null
        },
        order: [['start', 'DESC']],
        group: ['Survey.id']
    });

const surveysEndpoint = (req, res) =>
    findProjectBySlugF(req.params.slug)
        .chain(project =>
            Future.both(
                Future.of(project),
                findUserAsMemberOfProjectF([req.user, project])
            )
        )
        .map(([project, user]) =>
            Object.assign(project, {
                membership: parseMembership(user)
            })
        )
        .chain(project =>
            isMemberOfProject(project)
                ? Future.of(project)
                : Future.reject('Not a member of this project')
        )
        .chain(project =>
            Future.parallel(3, [
                Future.of(project),
                findCycleByIdF(req.params.id),
                findSurveysByCycle(req.params.id)
            ])
        );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycle/:id/surveys',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            surveysEndpoint(req, res).fork(
                _ => {
                    console.error(_);
                    return res.redirect(`/project/${req.params.slug}`);
                },
                ([project, cycle, surveys]) =>
                    renderProjectPage(
                        res,
                        'surveys',
                        Object.assign(
                            {
                                projectSlug: req.params.slug,
                                urlPath: req.path,
                                filter: req.query.filter || false,
                                dt: surveysDataTable({
                                    surveys,
                                    projectSlug: req.params.slug,
                                    cycle,
                                    project,
                                    req,
                                    filter: req.query.filter || false
                                }),
                                cycle,
                                surveys
                            },
                            renderProjectTemplate(project)
                        )
                    )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/surveys/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            surveysEndpoint(req, res).fork(
                _ => {
                    console.error(_);
                    return res.redirect(`/project/${req.params.slug}`);
                },
                ([project, cycle, surveys]) =>
                    res.json(
                        surveysDataTable({
                            surveys,
                            projectSlug: req.params.slug,
                            cycle,
                            project,
                            req,
                            filter: req.query.filter || false
                        }).obj()
                    )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/surveys/xml',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            surveysEndpoint(req, res).fork(
                _ => {
                    console.error(_);
                    return res.redirect(`/project/${req.params.slug}`);
                },
                ([project, cycle, surveys]) =>
                    surveysDataTable({
                        surveys,
                        projectSlug: req.params.slug,
                        cycle,
                        project,
                        req,
                        filter: req.query.filter || false
                    }).chain(table => {
                        const options = {
                            ignoreComment: true,
                            alwaysChildren: true
                        };

                        const data = DataTable.of(table).obj();
                        res.set('Content-Type', 'text/xml');
                        res.send(xml(data, options));
                    })
            )
    );

    router.get(
        '/project/:slug/cycle/:id/surveys/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            surveysEndpoint(req, res).fork(
                _ => {
                    console.error(_);
                    return res.redirect(`/project/${req.params.slug}`);
                },
                ([project, cycle, surveys]) =>
                    surveysDataTable({
                        surveys,
                        projectSlug: req.params.slug,
                        cycle,
                        project,
                        req,
                        filter: req.query.filter || false
                    }).chain(table => {
                        res.csv(table, true, {
                            'Content-disposition': `attachment; filename=${
                                req.params.slug
                            }_${t('surveys', project)}.csv`,
                            'Content-Type': 'text/csv'
                        });
                    })
            )
    );
};
