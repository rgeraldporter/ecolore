const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const fs = require('fs-extra');
const convert = require('xml-js');
const xml = require('xml');
const csv = require('csv-express');
const t = require('../../helpers/text').text;
const { csvHeader } = require('../../helpers/csv-helper');
const isViewFile = path => fs.existsSync(__dirname + '/../views/' + path);
const {
    parseProject,
    parseMembership
} = require('../../helpers/project-helper');

const isMemberOfProject = project =>
    R.path(['membership', 'role'], project) !== 'none';

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findOneCycle = Future.encaseP(a => db.Cycle.findOne(a));
const findAllObservation = Future.encaseP(a => db.Observation.findAll(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));

const { observationsDataTable } = require('../../datatables/observations.dt');

const renderProjectTemplate = project =>
    project ? { project: parseProject(project) } : { project: {} };

const renderProjectPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

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

const findProjectBySlugF = slug =>
    findOneProject({
        where: { slug },
        include: [{ model: db.Cycle, order: [['start', 'DESC']] }]
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

const findCycleByIdF = id =>
    findOneCycle({
        where: { id },
        include: [db.Project]
    });

const findObservationsBySurveyCycle = ([surveyId, cycleId]) =>
    findAllObservation({
        where: { surveyId, invalid: null },
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
                where: { cycleId },
                required: true
            },
            db.File,
            db.Review
        ],
        group: ['Observation.id']
    });

const observationsEndpoint = (req, res) =>
    findMemberBySlugF([req.params.slug, req.user])
        .chain(project =>
            Future.parallel(3, [
                Future.of(project),
                findCycleByIdF(req.params.cycleId),
                findObservationsBySurveyCycle([
                    req.params.surveyId,
                    req.params.cycleId
                ])
            ])
        )
        // verify it is part of the correct project
        .chain(([project, cycle, observations]) =>
            R.pathOr(Symbol('nonce'), ['Project', 'id'], cycle) !==
            project.get('id')
                ? Future.reject('Observations are not part of this project')
                : Future.of([project, cycle, observations])
        )
        .chain(([project, cycle, observations]) =>
            isMemberOfProject(project)
                ? Future.of([project, cycle, observations])
                : Future.reject('Not a member of this project')
        );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observations',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            observationsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycle, observations]) =>
                    renderProjectPage(
                        res,
                        'observations',
                        Object.assign(
                            {
                                cycle,
                                observations,
                                surveyId: req.params.surveyId,
                                urlPath: req.path,
                                dt: observationsDataTable({
                                    observations,
                                    cycle,
                                    projectSlug: req.params.slug,
                                    project: parseProject(project),
                                    req
                                })
                            },
                            renderProjectTemplate(project)
                        )
                    )
            )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observations/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            observationsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycle, observations]) =>
                    observationsDataTable({
                        observations,
                        cycle,
                        projectSlug: req.params.slug,
                        project: parseProject(project),
                        req
                    }).chain(table => {
                        res.csv(
                            table,
                            true,
                            csvHeader(
                                `${req.params.slug}_${t(
                                    'observations',
                                    project
                                )}`
                            )
                        );
                    })
            )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observations/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            observationsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycle, observations]) =>
                    res.json(
                        observationsDataTable({
                            observations,
                            cycle,
                            projectSlug: req.params.slug,
                            project: parseProject(project),
                            req
                        }).obj()
                    )
            )
    );
};
