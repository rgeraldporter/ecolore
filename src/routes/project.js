const passwordless = require('passwordless');
const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const moment = require('moment');
const randomToken = require('random-token');
const Op = db.Sequelize.Op;
const Future = require('fluture');
const fs = require('fs-extra');
const isViewFile = path => fs.existsSync(__dirname + '/../views/' + path);
const isValidationFile = path =>
    fs.existsSync(__dirname + '/../validations/' + path);
const validationPath = __dirname + '/../validations/';

const observationTemplate = project =>
    isViewFile(`forms/custom/${project.get('slug')}-observation.ejs`)
        ? `forms/custom/${project.get('slug')}-observation.ejs`
        : `forms/project-model/${project.get('model')}-observation.ejs`;

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

const rolePath = R.lensPath(['Memberships', 0, 'role']);
const sincePath = R.lensPath(['Memberships', 0, 'createdAt']);
const parseMembership = val => ({
    role: R.view(rolePath, val) || 'none',
    since: R.view(sincePath, val) || null
});

/* @todo verify cycles are part of the right project, etc */

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
    memberSince: R.pathOr(null, ['membership', 'since'], project),
    memberRole: R.pathOr('none', ['membership', 'role'], project),
    Cycles: project.get('Cycles')
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
    memberSince: R.propOr('none', 'since', parseMembership(project)),
    memberRole: R.propOr('none', 'role', parseMembership(project))
});

const renderProjectTemplate = project =>
    project ? { project: parseProject(project) } : { project: {} };

const renderProjectsTemplates = projects => ({
    projects: projects.map(parseProjectAndMemberships)
});

const parseMemberships = members =>
    members.map(member => Object.assign(member, parseMembership(member)));

const formatProjectMembership = membership =>
    Object.assign(R.omit(['Memberships'], membership.dataValues), {
        membership: parseMembership(membership)
    });

const findProjectById = projectId =>
    db.Project.findOne({
        where: { id: projectId },
        include: [{ model: db.Cycle, order: [['start', 'DESC']] }]
    });

const findProjectBySlug = slug =>
    db.Project.findOne({
        where: { slug },
        include: [{ model: db.Cycle, order: [['start', 'DESC']] }]
    });

const findProjectByIdAndOwner = ([projectId, user]) =>
    db.Project.findOne({
        where: { id: projectId },
        include: [
            {
                model: db.Membership,
                where: {
                    userId: user.get('id'),
                    [Op.or]: [{ role: 'owner' }, { role: 'administrator' }]
                }
            },
            { model: db.Cycle, order: [['start', 'DESC']] }
        ]
    });

const findProjectBySlugAndOwnerF = ([slug, user]) =>
    findOneProject({
        where: { slug },
        include: [
            {
                model: db.Membership,
                where: {
                    userId: user.get('id'),
                    [Op.or]: [{ role: 'owner' }, { role: 'administrator' }]
                }
            },
            { model: db.Cycle, order: [['start', 'DESC']] }
        ]
    });

const findProjectBySlugAndOwner = ([slug, user]) =>
    db.Project.findOne({
        where: { slug },
        include: [
            {
                model: db.Membership,
                where: {
                    userId: user.get('id'),
                    [Op.or]: [{ role: 'owner' }, { role: 'administrator' }]
                }
            },
            { model: db.Cycle, order: [['start', 'DESC']] }
        ]
    });

const findUserAsMemberOfProject = ([email, project, required = true]) =>
    db.User.findOne({
        where: { email },
        include: [
            {
                model: db.Membership,
                where: { projectId: project.id },
                required
            }
        ]
    });

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

const findUserAsMemberOfProjectById = ([userId, project, required = true]) =>
    db.User.findOne({
        where: { id: userId },
        include: [
            {
                model: db.Membership,
                where: { projectId: project.id },
                required
            }
        ]
    });

const findMapById = id =>
    db.Map.findOne({
        where: { id },
        include: [db.Project]
    });

const findCycleById = id =>
    db.Cycle.findOne({
        where: { id },
        include: [db.Project]
    });

const findOneCycle = Future.encaseP(a => db.Cycle.findOne(a));

const findCycleByIdF = id =>
    findOneCycle({
        where: { id },
        include: [db.Project]
    });

const renderProjectPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

const isMemberOfProject = project =>
    R.path(['membership', 'role'], project) !== 'none';

const findMemberBySlug = ([slug, userEmail]) =>
    findProjectBySlug(slug).then(project =>
        findUserAsMemberOfProject([userEmail, project, false]).then(user =>
            Object.assign(project, {
                membership: parseMembership(user)
            })
        )
    );

const findOneUser = Future.encaseP(a => db.User.findOne(a));
const findAllUser = Future.encaseP(a => db.User.findAll(a));
const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findAllMaps = Future.encaseP(a => db.Map.findAll(a));
const findAllCycle = Future.encaseP(a => db.Cycle.findAll(a));
const findAllZone = Future.encaseP(a => db.Zone.findAll(a));
const findZone = Future.encaseP(a => db.Zone.find(a));
const findAllSurvey = Future.encaseP(a => db.Survey.findAll(a));
const findOneSurvey = Future.encaseP(a => db.Survey.findOne(a));
const findAllObservation = Future.encaseP(a => db.Observation.findAll(a));
const findOneObservation = Future.encaseP(a => db.Observation.findOne(a));
const findAllFile = Future.encaseP(a => db.File.findAll(a));
const findAllProject = Future.encaseP(a => db.Project.findAll(a));
const createDriveState = Future.encaseP(a =>
    db.Google_Drive_Project_State.create(a)
);

const findProjectsByUserMember = user =>
    findAllProject({
        include: [
            {
                model: db.Membership,
                where: { userId: user.id },
                required: true
            }
        ]
    });

const findObservationBySurveyAndId = ([surveyId, id]) =>
    findOneObservation({
        where: {
            surveyId,
            id
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
            }
        ]
    });

const findObservationBySurveyAndIdWithFiles = ([surveyId, id]) =>
    findOneObservation({
        where: {
            surveyId,
            id
        },
        attributes: {
            include: [
                [
                    db.Sequelize.fn('COUNT', db.Sequelize.col('files.id')),
                    'fileCount'
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
            db.File
        ]
    });

const findObservationsBySurveyCycle = ([surveyId, cycleId]) =>
    findAllObservation({
        where: { surveyId, invalid: null },
        attributes: {
            include: [
                [
                    db.Sequelize.fn('COUNT', db.Sequelize.col('files.id')),
                    'fileCount'
                ]
            ]
        },
        include: [
            {
                model: db.Survey,
                where: { cycleId },
                required: true
            },
            db.File
        ],
        group: ['Observation.id']
    });

const findSurveysByCycle = cycle =>
    findAllSurvey({
        attributes: {
            include: [
                [
                    db.Sequelize.fn(
                        'COUNT',
                        db.Sequelize.col('observations.id')
                    ),
                    'observationCount'
                ]
            ]
        },
        include: [
            db.Observation,
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

const findUserAsMemberOfProjectF = ([email, project, required = true]) =>
    findOneUser({
        where: { email },
        include: [
            {
                model: db.Membership,
                where: { projectId: project.id },
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

const findMemberById = ([projectId, userEmail]) =>
    findProjectById(projectId).then(project =>
        findUserAsMemberOfProject([userEmail, project, false]).then(user =>
            Object.assign(project, {
                membership: parseMembership(user)
            })
        )
    );

module.exports = function(router) {
    router.get(
        '/project/:slug/auth/google/drive',
        passwordless.restricted(),
        (req, res) => {
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
                .chain(project =>
                    createDriveState({
                        token: randomToken(32),
                        projectId: project.id
                    })
                )
                .fork(
                    _ => res.redirect('error'),
                    state =>
                        res.redirect(
                            '/user/auth/google/drive/' + state.get('token')
                        )
                );
        }
    );

    router.get('/project/:slug/edit', passwordless.restricted(), (req, res) =>
        findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
            .chain(
                project =>
                    project
                        ? Future.of(project)
                        : Future.reject(
                              'You do not have access to edit this project'
                          )
            )
            .fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                project =>
                    renderProjectPage(
                        res,
                        'project-registration',
                        renderProjectTemplate(project)
                    )
            )
    );

    router.get('/projects', passwordless.restricted(), (req, res) => {
        findAllProject({ where: { public: 1 } }).fork(
            _ => res.redirect(`/project/${req.params.slug}`),
            projects => renderProjectPage(res, 'projects', { projects })
        );
    });

    router.get('/my-projects', passwordless.restricted(), (req, res) =>
        findProjectsByUserMember(res.locals.user).fork(
            _ => res.redirect(`/project/${req.params.slug}`),
            projects =>
                renderProjectPage(
                    res,
                    'my-projects',
                    renderProjectsTemplates(projects)
                )
        )
    );

    router.post(
        '/project/browse-cycle',
        [
            check('cycle').exists(),
            check('project_slug').exists(),
            check('submit').exists(),
            passwordless.restricted()
        ],
        (req, res) => {
            const data = matchedData(req);
            if (data.submit == 'cycle') {
                res.redirect(
                    '/project/' + data.project_slug + '/cycle/' + data.cycle
                );
            } else if (data.submit == 'surveys') {
                res.redirect(
                    '/project/' +
                        data.project_slug +
                        '/cycle/' +
                        data.cycle +
                        '/surveys'
                );
            } else if (data.submit == 'new-survey') {
                res.redirect(
                    '/project/' +
                        data.project_slug +
                        '/cycle/' +
                        data.cycle +
                        '/survey/new'
                );
            }
        }
    );

    router.get('/project/create', passwordless.restricted(), (req, res) =>
        renderProjectPage(res, 'project-registration', { project: {} })
    );

    router.get('/project/:slug', passwordless.restricted(), (req, res) =>
        findMemberBySlugF([req.params.slug, req.user]).fork(
            console.error,
            project =>
                renderProjectPage(
                    res,
                    'project',
                    renderProjectTemplate(project)
                )
        )
    );

    router.get(
        '/project/:slug/submit',
        passwordless.restricted(),
        (req, res) => {
            findProjectBySlugF(req.params.slug).fork(console.error, project =>
                res.redirect(
                    '/project/' +
                    req.params.slug +
                    '/cycle/' +
                    project.Cycles[0].id + // @todo account for project without cycles
                        '/survey/new'
                )
            );
        }
    );

    router.get('/project/:slug/join', passwordless.restricted(), (req, res) =>
        findProjectBySlugF(req.params.slug).fork(console.error, project =>
            renderProjectPage(
                res,
                'project-join',
                renderProjectTemplate(project)
            )
        )
    );

    router.get('/project/:slug/maps', passwordless.restricted(), (req, res) =>
        findMemberBySlugF([req.params.slug, req.user])
            .chain(project =>
                Future.both(
                    Future.of(project),
                    findAllMaps({
                        where: { projectId: project.id },
                        order: [['name', 'ASC']]
                    })
                )
            )
            .chain(
                ([project, maps]) =>
                    isMemberOfProject(project)
                        ? Future.of([project, maps])
                        : Future.reject('Not a member')
            )
            .fork(
                _ => res.redirect(`/project/${req.params.slug}/join`),
                ([project, maps]) =>
                    renderProjectPage(
                        res,
                        'project-maps',
                        Object.assign({ maps }, renderProjectTemplate(project))
                    )
            )
    );

    router.get(
        '/project/:slug/membership/:id',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findUserAsMemberOfProjectByIdF([req.params.id, project])
                    )
                )
                .chain(
                    ([project, membership]) =>
                        membership.get('id') == res.locals.user.id
                            ? Future.reject('Cannot edit own membership')
                            : Future.of([project, membership])
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, membership]) =>
                        renderProjectPage(
                            res,
                            'project-membership',
                            Object.assign(
                                formatProjectMembership(membership),
                                renderProjectTemplate(project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/members',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findUserAsMemberOfProjectF([req.user, project, false])
                    )
                )
                .chain(
                    ([project, user]) =>
                        project.get('id')
                            ? Future.of([project, user])
                            : Future.reject('You are not a project owner')
                )
                .map(([project, user]) =>
                    Object.assign(project, {
                        membership: parseMembership(user)
                    })
                )
                .chain(membershipProject =>
                    Future.both(
                        Future.of(membershipProject),
                        findAllUser({
                            include: [
                                {
                                    model: db.Membership,
                                    where: {
                                        projectId: membershipProject.get('id')
                                    }
                                }
                            ]
                        })
                    )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([membershipProject, members]) =>
                        renderProjectPage(
                            res,
                            'project-members',
                            Object.assign(
                                { members: parseMemberships(members) },
                                renderProjectTemplate(membershipProject)
                            )
                        )
                )
    );

    router.get('/project/:slug/invite', passwordless.restricted(), (req, res) =>
        findProjectBySlugAndOwnerF([req.params.slug, res.locals.user]).fork(
            _ => res.redirect(`/project/${req.params.slug}`),
            project =>
                renderProjectPage(
                    res,
                    'project-invite',
                    Object.assign({ project: parseProject(project) })
                )
        )
    );
    /*
    Invitation table:
        - invitation code (link)
        - option to email it direct from site, or copy/paste into email client
        - user clicks link, logs in with the email & joins project simultaneously
        - new user clicks link, is added to project and redirected to profile page?
    */

    router.get('/project/:slug/cycles', passwordless.restricted(), (req, res) =>
        findMemberBySlugF([req.params.slug, req.user])
            .chain(
                project =>
                    project.get('id')
                        ? Future.of(project)
                        : Future.reject('You are not a member of this project')
            )
            .chain(project =>
                Future.both(
                    Future.of(project),
                    findAllCycle({
                        where: { projectId: project.id },
                        order: [['start', 'DESC']]
                    })
                )
            )
            .fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycles]) =>
                    renderProjectPage(
                        res,
                        'project-cycles',
                        Object.assign(
                            { cycles },
                            renderProjectTemplate(project)
                        )
                    )
            )
    );

    router.get('/project/:slug/zones', passwordless.restricted(), (req, res) =>
        findMemberBySlugF([req.params.slug, req.user])
            .chain(project =>
                Future.both(
                    Future.of(project),
                    findAllZone({
                        where: { projectId: project.id },
                        order: [['code', 'ASC']]
                    })
                )
            )
            .chain(
                ([project, zones]) =>
                    isMemberOfProject(project)
                        ? Future.of([project, zones])
                        : Future.reject('You are not a member of this project')
            )
            .fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, zones]) =>
                    renderProjectPage(
                        res,
                        'zones',
                        Object.assign({ zones }, renderProjectTemplate(project))
                    )
            )
    );

    router.get(
        '/project/:slug/zone/new',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
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
                .chain(
                    membershipProject =>
                        isMemberOfProject(membershipProject)
                            ? Future.of(membershipProject)
                            : Future.reject('Not a member of the project')
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    membershipProject =>
                        renderProjectPage(
                            res,
                            'zone-create',
                            Object.assign(
                                renderProjectTemplate(membershipProject),
                                {
                                    zone: {}
                                }
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/zone/:zoneId',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findZone({
                            where: { id: req.params.zoneId }
                        })
                    )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, zone]) =>
                        renderProjectPage(
                            res,
                            'zone',
                            Object.assign(
                                { zone },
                                renderProjectTemplate(project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/zone/:zoneId/edit',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findZone({
                            where: { id: req.params.zoneId }
                        })
                    )
                )
                .chain(
                    ([project, zone]) =>
                        isMemberOfProject(project)
                            ? Future.of([project, zone])
                            : Future.reject(
                                  'You are not a member of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, zone]) =>
                        renderProjectPage(
                            res,
                            'zone-create',
                            Object.assign(
                                { zone },
                                renderProjectTemplate(project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/surveys',
        passwordless.restricted(),
        (req, res) =>
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
                .chain(
                    project =>
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
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, cycle, surveys]) =>
                        renderProjectPage(
                            res,
                            'surveys',
                            Object.assign(
                                {
                                    projectSlug: req.params.slug
                                },
                                renderProjectTemplate(cycle.Project),
                                { cycle: cycle },
                                { surveys }
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observations',
        passwordless.restricted(),
        (req, res) =>
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
                .chain(
                    ([project, cycle, observations]) =>
                        isMemberOfProject(project)
                            ? Future.of([project, cycle, observations])
                            : Future.reject('Not a member of this project')
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, cycle, observations]) =>
                        renderProjectPage(
                            res,
                            'observations',
                            Object.assign(
                                { cycle },
                                { observations },
                                { surveyId: req.params.surveyId },
                                renderProjectTemplate(cycle.Project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observation/new',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findSurveyByCycleAndId([
                            req.params.cycleId,
                            req.params.surveyId
                        ])
                    )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, survey]) =>
                        renderProjectPage(
                            res,
                            observationTemplate(project),
                            Object.assign(renderProjectTemplate(project), {
                                cycle: { id: req.params.cycleId },
                                survey
                            })
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observation/:observationId/resubmit',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findOneSurvey({
                            where: {
                                cycleId: req.params.cycleId,
                                id: req.params.surveyId
                            }
                        })
                    )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, survey]) =>
                        renderProjectPage(
                            res,
                            observationTemplate(project),
                            Object.assign(renderProjectTemplate(project), {
                                cycle: { id: req.params.cycleId },
                                survey,
                                resubmit: {
                                    id: req.params.observationId
                                }
                            })
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId',
        passwordless.restricted(),
        (req, res) =>
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
                .chain(
                    ([project, observation]) =>
                        isMemberOfProject(project)
                            ? Future.of([project, observation])
                            : Future.reject('Not a member of this project')
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, observation]) =>
                        renderProjectPage(
                            res,
                            'observation',
                            Object.assign(
                                {
                                    cycleId: req.params.id,
                                    projectSlug: req.params.slug,
                                    observation
                                },
                                renderProjectTemplate(project),
                                { review: false }
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/files',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.parallel(3, [
                        Future.of(project),
                        findObservationBySurveyAndId([
                            req.params.surveyId,
                            req.params.observationId
                        ]),
                        findAllFile({
                            where: {
                                observationId: req.params.observationId
                            }
                        })
                    ])
                )
                .chain(
                    ([project, observation, files]) =>
                        isMemberOfProject(project)
                            ? Future.of([project, observation, files])
                            : Future.reject(
                                  'You are not a part of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, observation, files]) =>
                        renderProjectPage(
                            res,
                            'files',
                            Object.assign(
                                {
                                    observation,
                                    files
                                },
                                renderProjectTemplate(project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/upload',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findObservationBySurveyAndId([
                            req.params.surveyId,
                            req.params.observationId
                        ])
                    )
                )
                .chain(
                    ([project, observation]) =>
                        isMemberOfProject(project)
                            ? Future.of([project, observation])
                            : Future.reject(
                                  'You are not a member of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, observation]) =>
                        renderProjectPage(
                            res,
                            'photo-upload',
                            Object.assign(
                                {
                                    observation,
                                    surveyId: req.params.surveyId,
                                    projectSlug: req.params.slug,
                                    cycleId: req.params.id
                                },
                                renderProjectTemplate(project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/review',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(
                        Future.of(project),
                        findObservationBySurveyAndId([
                            req.params.surveyId,
                            req.params.observationId
                        ])
                    )
                )
                .chain(
                    ([project, observation]) =>
                        isMemberOfProject(project)
                            ? Future.of([project, observation])
                            : Future.reject(
                                  'You are not a member of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, observation]) =>
                        renderProjectPage(
                            res,
                            'observation',
                            Object.assign(
                                {
                                    cycleId: req.params.id,
                                    projectSlug: req.params.slug,
                                    observation
                                },
                                renderProjectTemplate(project),
                                { review: true }
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/new',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(
                    project =>
                        isMemberOfProject(project)
                            ? Future.of(project)
                            : Future.reject(
                                  'You are not a member of this project'
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
                                zones
                            })
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/resubmit',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlugF([req.params.slug, req.user])
                .chain(
                    project =>
                        isMemberOfProject(project)
                            ? Future.of(project)
                            : Future.reject(
                                  'You are not a member of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    project =>
                        renderProjectPage(
                            res,
                            surveyTemplate(project),
                            Object.assign(renderProjectTemplate(project), {
                                cycle: { id: req.params.id },
                                resubmit: {
                                    id: req.params.surveyId
                                }
                            })
                        )
                )
    );

    const findSurveyByCycleAndId = ([cycleId, id]) =>
        findOneSurvey({
            attributes: {
                include: [
                    [
                        db.Sequelize.fn(
                            'COUNT',
                            db.Sequelize.col('observations.id')
                        ),
                        'observationCount'
                    ]
                ]
            },
            where: { cycleId, id },
            include: [
                {
                    model: db.Cycle,
                    include: [db.Project]
                },
                db.Observation
            ]
        });

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId',
        passwordless.restricted(),
        (req, res) =>
            findSurveyByCycleAndId([req.params.id, req.params.surveyId])
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
                .chain(
                    ([survey, membership]) =>
                        membership
                            ? Future.of([survey, membership])
                            : Future.reject(
                                  'You are not a member of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([survey, membership]) =>
                        renderProjectPage(
                            res,
                            'survey',
                            Object.assign(
                                {
                                    survey,
                                    review: false
                                },
                                renderProjectTemplate(survey.Cycle.Project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/review',
        passwordless.restricted(),
        (req, res) =>
            findSurveyByCycleAndId([req.params.id, req.params.surveyId])
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
                .chain(
                    ([survey, membership]) =>
                        membership
                            ? Future.of([survey, membership])
                            : Future.reject(
                                  'You are not a member of this project'
                              )
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([survey, membership]) =>
                        renderProjectPage(
                            res,
                            'survey',
                            Object.assign(
                                {
                                    survey,
                                    review: true
                                },
                                renderProjectTemplate(survey.Cycle.Project)
                            )
                        )
                )
    );

    router.get(
        '/project/:slug/cycle/create',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user]).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                project =>
                    renderProjectPage(res, 'cycle-create', {
                        cycle: {
                            Project: {
                                id: project.get('id'),
                                title: project.get('title'),
                                slug: project.get('slug')
                            }
                        }
                    })
            )
    );

    router.get(
        '/project/:slug/map/add',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user]).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                project =>
                    renderProjectPage(res, 'map-add', {
                        map: {
                            Project: {
                                id: project.get('id'),
                                title: project.get('title'),
                                slug: project.get('slug')
                            }
                        }
                    })
            )
    );

    const findOneMap = Future.encaseP(a => db.Map.findOne(a));
    const findMapByIdF = id =>
        findOneMap({
            where: { id },
            include: [db.Project]
        });

    router.get(
        '/project/:slug/map/:id/edit',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
                .chain(
                    project =>
                        project
                            ? Future.of(project)
                            : Future.reject(
                                  'You are not an owner of this project'
                              )
                )
                .chain(project =>
                    Future.both(Future.of(project), findMapByIdF(req.params.id))
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    ([project, map]) =>
                        renderProjectPage(res, 'map-add', { map })
                )
    );

    router.get(
        '/project/:slug/map/:id',
        passwordless.restricted(),
        (req, res) => {
            findMemberBySlugF([req.params.slug, req.user])
                .chain(project =>
                    Future.both(Future.of(project), findMapByIdF(req.params.id))
                )
                .map(([project, map]) =>
                    Object.assign(map, renderProjectTemplate(project))
                )
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    map =>
                        renderProjectPage(res, 'map', {
                            map,
                            project: map.project
                        })
                );
        }
    );

    router.get(
        '/project/:slug/cycle/:id',
        passwordless.restricted(),
        (req, res) =>
            findCycleByIdF(req.params.id).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                cycle => renderProjectPage(res, 'cycle', { cycle })
            )
    );

    router.get(
        '/project/:slug/cycle/:id/edit',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwnerF([req.params.slug, res.locals.user])
                .chain(
                    project =>
                        project
                            ? Future.of(project)
                            : Future.reject(
                                  'You are not an owner of this project'
                              )
                )
                .chain(project => findCycleByIdF(req.params.id))
                .fork(
                    _ => res.redirect(`/project/${req.params.slug}`),
                    cycle =>
                        renderProjectPage(res, 'cycle-create', {
                            cycle
                        })
                )
    );

    router.post(
        '/project/new',
        [
            check('title').exists(),
            check('slug').exists(),
            check('model').exists(),
            check('location').exists(),
            check('description').exists(),
            check('public').exists(),
            check('status').exists(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'project-registration');
            } else {
                const projectCreate = matchedData(req);
                projectCreate.creatorId = res.locals.user.id;

                db.Project.create(projectCreate)
                    .then(project => {
                        db.Membership.create({
                            role: 'owner',
                            projectId: project.id,
                            userId: projectCreate.creatorId
                        }).then(() => res.redirect('/project/' + project.slug));
                    })
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:id',
        [
            check('title').exists(),
            check('slug').exists(),
            check('model').exists(),
            check('location').exists(),
            check('description').exists(),
            check('public').exists(),
            check('status').exists(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'project-registration');
            } else {
                const projectUpdate = matchedData(req);

                return findProjectByIdAndOwner([req.params.id, res.locals.user])
                    .then(
                        project =>
                            project
                                ? db.Project.update(projectUpdate, {
                                      where: { id: req.params.id }
                                  })
                                      .then(() =>
                                          db.Project.findOne({
                                              where: { id: req.params.id }
                                          })
                                      )
                                      .then(project =>
                                          res.redirect(
                                              '/project/' + project.slug
                                          )
                                      )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:slug/cycle/new',
        [
            check('title').exists(),
            check('start').exists(),
            check('end').exists(),
            check('description').exists(),
            check('project').exists(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'cycle-create');
            } else {
                const cycleCreate = matchedData(req);
                cycleCreate.projectId = cycleCreate.project;
                cycleCreate.creatorId = res.locals.user.id;

                return findProjectBySlugAndOwner([
                    req.params.slug,
                    res.locals.user
                ])
                    .then(
                        project =>
                            project
                                ? db.Cycle.create(cycleCreate).then(cycle =>
                                      res.redirect(
                                          '/project/' +
                                              req.params.slug +
                                              '/cycles'
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:slug/cycle/:id',
        [
            check('title').exists(),
            check('start').exists(),
            check('end').exists(),
            check('description').exists(),
            check('project').exists(),
            check('taxa').optional(),
            passwordless.restricted()
        ],
        (req, res, next) => {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'cycle-create');
            } else {
                const cycleUpdate = matchedData(req);
                cycleUpdate.taxa = cycleUpdate.taxa.split(/\r|\n/).filter(a=>a);
                return findProjectBySlugAndOwner([
                    req.params.slug,
                    res.locals.user
                ])
                    .then(
                        project =>
                            project
                                ? db.Cycle.update(cycleUpdate, {
                                      where: {
                                          id: req.params.id,
                                          projectId: project.id
                                      }
                                  }).then(() =>
                                      res.redirect(
                                          '/project/' +
                                              req.params.slug +
                                              '/cycles'
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:slug/zone/new',
        [
            check('code').exists(),
            check('name').optional(),
            check('project').exists(),
            check('description').optional(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'zone-create');
            } else {
                const zoneAdd = matchedData(req);
                zoneAdd.projectId = zoneAdd.project;

                return findProjectBySlugAndOwner([
                    req.params.slug,
                    res.locals.user
                ])
                    .then(
                        project =>
                            project
                                ? db.Zone.create(zoneAdd).then(zone =>
                                      res.redirect(
                                          '/project/' +
                                              req.params.slug +
                                              '/zones'
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:slug/zone/:id',
        [
            check('code').exists(),
            check('name').optional(),
            check('description').optional(),
            check('project').exists(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'zone-create');
            } else {
                const zoneUpdate = matchedData(req);
                return findProjectBySlugAndOwner([
                    req.params.slug,
                    res.locals.user
                ])
                    .then(
                        project =>
                            project
                                ? db.Zone.update(zoneUpdate, {
                                      where: {
                                          id: req.params.id,
                                          projectId: project.id
                                      }
                                  }).then(map =>
                                      res.redirect(
                                          '/project/' +
                                              req.params.slug +
                                              '/zones/'
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:slug/map/new',
        [
            check('kml').exists(),
            check('embedCode').exists(),
            check('name').exists(),
            check('url').exists(),
            check('project').exists(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'map-add');
            } else {
                const mapAdd = matchedData(req);
                mapAdd.projectId = mapAdd.project;

                if (mapAdd.kml == '') {
                    mapAdd.kml = null;
                }
                if (mapAdd.url == '') {
                    mapAdd.url = null;
                }

                mapAdd.creatorId = res.locals.user.id;

                return findProjectBySlugAndOwner([
                    req.params.slug,
                    res.locals.user
                ])
                    .then(
                        project =>
                            project
                                ? db.Map.create(mapAdd).then(map =>
                                      res.redirect(
                                          '/project/' +
                                              req.params.slug +
                                              '/map/' +
                                              map.id
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post(
        '/project/:slug/map/:id',
        [
            check('kml').exists(),
            check('embedCode').exists(),
            check('name').exists(),
            check('url').exists(),
            check('project').exists(),
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'map-add');
            } else {
                const mapUpdate = matchedData(req);

                if (mapUpdate.kml == '') {
                    mapUpdate.kml = null;
                }
                if (mapUpdate.url == '') {
                    mapUpdate.url = null;
                }

                return findProjectBySlugAndOwner([
                    req.params.slug,
                    res.locals.user
                ])
                    .then(
                        project =>
                            project
                                ? db.Map.update(mapUpdate, {
                                      where: {
                                          id: req.params.id,
                                          projectId: project.id
                                      }
                                  }).then(map =>
                                      res.redirect(
                                          '/project/' +
                                              req.params.slug +
                                              '/map/' +
                                              req.params.id
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                    .catch(err => console.error(err));
            }
        }
    );

    router.post('/project/:slug/add', [passwordless.restricted()], function(
        req,
        res,
        next
    ) {
        const errors = validationResult(req);
        console.log('errors', errors.mapped());
        // @todo: handle errors better
        if (!errors.isEmpty()) {
            renderProjectPage(res, 'project-join');
        } else {
            const addMembership = {
                userId: null,
                projectId: null,
                role: 'pending'
            };

            addMembership.userId = res.locals.user.id;

            findProjectBySlug(req.params.slug)
                .then(project => {
                    addMembership.projectId = project.id;
                })
                .then(() => db.Membership.create(addMembership))
                .then(() => res.redirect('/project/' + req.params.slug))
                .catch(err => console.error(err));
        }
    });

    router.post(
        '/project/:slug/membership/:id',
        [passwordless.restricted(), check('role').exists()],
        function(req, res, next) {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return renderProjectPage(res, 'project-membership');
            }
            const editMembership = matchedData(req);

            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(project =>
                    db.Membership.update(editMembership, {
                        where: {
                            userId: req.params.id,
                            projectId: project.get('id')
                        }
                    })
                )
                .then(() =>
                    res.redirect('/project/' + req.params.slug + '/members')
                )
                .catch(err => console.error(err));
        }
    );

    const getObservationsValidations = project =>
        isValidationFile(`custom/${project.get('slug')}.js`)
            ? require(`${validationPath}custom/${project.get('slug')}.js`)
                  .observations
            : require(`${validationPath}${project.get('model')}.js`)
                  .observations;

    const checkRequirements = ([validations, req, res, next]) =>
        check(validations.exists).exists()(req, res, next);

    const checkOptionals = ([validations, req, res, next]) =>
        check(validations.optional).optional()(req, res, next);

    const validateObservationData = (req, res, next) =>
        findProjectBySlugF(req.params.slug)
            .map(getObservationsValidations)
            .chain(validations =>
                Future.do(function*() {
                    const encasedCheckRequires = Future.encaseP(
                        checkRequirements
                    );
                    const encasedCheckOptionals = Future.encaseP(
                        checkOptionals
                    );
                    yield encasedCheckRequires([
                        validations,
                        req,
                        res,
                        () => true
                    ]);
                    yield encasedCheckOptionals([
                        validations,
                        req,
                        res,
                        () => true
                    ]);
                    return;
                })
            )
            .fork(console.error, next);

    router.post(
        '/project/:slug/observation',
        [passwordless.restricted(), validateObservationData],
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.error('ERRORS', { errors: errors.mapped() });
                return renderProjectPage(res, 'project-membership');
            }
            const data = matchedData(req);
            const survey = data.survey;
            const cycle = data.cycle;
            const observation = {
                data: R.omit(['survey', 'cycle'], data),
                surveyId: Number(survey)
            };

            const moreObservations = () => R.prop('more_observations', data);
            const resubmit = () => R.prop('resubmit', data);

            const redirectToNewObservation = () =>
                res.redirect(
                    '/project/' +
                        req.params.slug +
                        '/cycle/' +
                        cycle +
                        '/survey/' +
                        observation.surveyId +
                        '/observation/new'
                );
            const redirectToObservations = slug => survey =>
                res.redirect(
                    '/project/' +
                        req.params.slug +
                        '/cycle/' +
                        cycle +
                        '/survey/' +
                        observation.surveyId +
                        '/observations'
                );

            const createOrUpdateObservation = () =>
                data.resubmit
                    ? db.Observation.update(observation, {
                          where: { id: data.resubmit }
                      })
                    : db.Observation.create(observation);

            return findMemberBySlug([req.params.slug, req.user])
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? createOrUpdateObservation().then(
                                  R.cond([
                                      [resubmit, redirectToObservations],
                                      [
                                          moreObservations,
                                          redirectToNewObservation(
                                              req.params.slug
                                          )
                                      ],
                                      [R.T, redirectToObservations]
                                  ])
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => console.error(err));
        }
    );

    const getSurveyValidations = form => project =>
        isValidationFile(
            `custom/${project.get('slug')}${form ? '-' + form : ''}.js`
        )
            ? require(`custom/${project.get('slug')}${
                  form ? '-' + form : ''
              }.js`).surveys
            : require(`${validationPath}${project.get('model')}${
                  form ? '-' + form : ''
              }.js`).surveys;

    const validateSurveyData = (req, res, next) =>
        findProjectBySlugF(req.params.slug)
            .map(getSurveyValidations(req.body.form))
            .chain(validations =>
                Future.do(function*() {
                    const encasedCheckRequires = Future.encaseP(
                        checkRequirements
                    );
                    const encasedCheckOptionals = Future.encaseP(
                        checkOptionals
                    );
                    yield encasedCheckRequires([
                        validations,
                        req,
                        res,
                        () => true
                    ]);
                    yield encasedCheckOptionals([
                        validations,
                        req,
                        res,
                        () => true
                    ]);
                    return;
                })
            )
            .fork(console.error, next);

    router.post(
        '/project/:slug/survey',
        [passwordless.restricted(), validateSurveyData],
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.error('ERRORS', { errors: errors.mapped() });
                return renderProjectPage(res, 'project-membership');
            }
            const data = matchedData(req);
            const cycle = data.cycle;
            const surveyData = {
                authorId: res.locals.user.id,
                data: R.omit(['cycle', 'resubmit', 'skip_observations'], data),
                cycleId: Number(cycle),
                start:
                    data.date && data.start_time
                        ? moment(data.date + ' ' + data.start_time).format()
                        : null,
                end:
                    data.date && data.end_time
                        ? moment(data.date + ' ' + data.end_time).format()
                        : null
            };

            const skipObservations = () => R.prop('skip_observations', data);
            const resubmit = () => R.prop('resubmit', data);
            const redirectToSurveyList = () =>
                res.redirect(
                    '/project/' +
                        req.params.slug +
                        '/cycle/' +
                        data.cycle +
                        '/surveys'
                );
            const redirectToNewSurvey = () =>
                res.redirect(
                    '/project/' +
                        req.params.slug +
                        '/cycle/' +
                        data.cycle +
                        '/survey/new' +
                        (data.form ? '?form=' + data.form : '')
                );
            const redirectToObservations = survey =>
                res.redirect(
                    '/project/' +
                        req.params.slug +
                        '/cycle/' +
                        data.cycle +
                        '/survey/' +
                        survey.id +
                        '/observation/new'
                );

            const createOrUpdateSurvey = () =>
                data.resubmit
                    ? db.Survey.update(surveyData, {
                          where: { id: data.resubmit }
                      })
                    : db.Survey.create(surveyData);

            return findMemberBySlug([req.params.slug, req.user])
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? createOrUpdateSurvey().then(
                                  R.cond([
                                      [resubmit, redirectToSurveyList],
                                      [skipObservations, redirectToNewSurvey],
                                      [R.T, redirectToObservations]
                                  ])
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => console.error(err));
        }
    );

    router.post(
        '/project/:slug/cycle/:id/survey/:surveyId/review',
        [passwordless.restricted(), check('invalidate').optional()],
        (req, res) => {
            const invalidateSurvey = surveyId =>
                db.Survey.findOne({
                    where: {
                        id: surveyId
                    }
                })
                    .then(survey =>
                        db.Survey.create(
                            Object.assign(
                                R.pick(
                                    [
                                        'start',
                                        'end',
                                        'review',
                                        'authorId',
                                        'createdAt'
                                    ],
                                    survey.dataValues
                                ),
                                {
                                    invalid: true,
                                    data: Object.assign(
                                        JSON.parse(survey.get('data')),
                                        {
                                            __metadata: {
                                                original_id: surveyId,
                                                original_cycle_id: survey.get(
                                                    'cycleId'
                                                ),
                                                invalidated_by_user:
                                                    res.locals.user.id
                                            }
                                        }
                                    )
                                }
                            )
                        )
                    )
                    .then(invalidSurvey =>
                        res.redirect(
                            `/project/${req.params.slug}/cycle/${
                                req.params.id
                            }/survey/${req.params.surveyId}/resubmit`
                        )
                    );

            const processReview = data =>
                data.invalidate
                    ? invalidateSurvey(req.params.surveyId)
                    : addReview(req.params.surveyId);

            const data = matchedData(req);
            return findMemberBySlug([req.params.slug, req.user])
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? processReview(data)
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => console.error(err));
        }
    );

    router.post(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/review',
        [
            passwordless.restricted(),
            check('invalidate').optional(),
            check('comments').optional()
        ],
        (req, res) => {
            const invalidateObservation = observationId =>
                db.Observation.findOne({
                    where: {
                        id: observationId
                    }
                })
                    .then(observation =>
                        db.Observation.create(
                            Object.assign(
                                R.pick(['review'], observation.dataValues),
                                {
                                    invalid: true,
                                    data: Object.assign(
                                        JSON.parse(observation.get('data')),
                                        {
                                            __metadata: {
                                                original_id: observationId,
                                                original_survey_id: observation.get(
                                                    'surveyId'
                                                ),
                                                invalidated_by_user:
                                                    res.locals.user.id
                                            }
                                        }
                                    )
                                }
                            )
                        )
                    )
                    .then(invalidObservation =>
                        res.redirect(
                            `/project/${req.params.slug}/cycle/${
                                req.params.id
                            }/survey/${req.params.surveyId}/observation/${
                                req.params.observationId
                            }/resubmit`
                        )
                    );

            const addReview = data =>
                db.Review.create({
                    comments: data.comments,
                    reviewerId: res.locals.user.id,
                    observationId: req.params.observationId,
                    pass: true
                });

            const processReview = data =>
                data.invalidate
                    ? invalidateObservation(req.params.observationId)
                    : addReview(req.params.observationId);

            const data = matchedData(req);
            return findMemberBySlug([req.params.slug, req.user])
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? processReview(data)
                            : project
                )
                .then(_ => res.redirect(`/project/${req.params.slug}`))
                .catch(err => console.error(err));
        }
    );
};
