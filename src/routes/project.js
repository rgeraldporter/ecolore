const passwordless = require('passwordless');
const { body, check, validationResult } = require('express-validator/check');
const { sanitizeBody, matchedData } = require('express-validator/filter');
const db = require('../models/index');
const R = require('ramda');
const moment = require('moment');
const randomToken = require('random-token');
const Op = db.Sequelize.Op;

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

const findProjectsByUserMember = user =>
    db.Project.findAll({
        include: [
            {
                model: db.Membership,
                where: { userId: user.id },
                required: true
            }
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
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(project =>
                    db.Google_Drive_Project_State.create({
                        token: randomToken(32),
                        projectId: project.id
                    })
                )
                .then(state =>
                    res.redirect(
                        '/user/auth/google/drive/' + state.get('token')
                    )
                )
                .catch(err => res.redirect('error'));
        }
    );

    router.get('/project/:slug/edit', passwordless.restricted(), (req, res) =>
        findProjectBySlugAndOwner([req.params.slug, res.locals.user])
            .then(
                project =>
                    project
                        ? renderProjectPage(
                              res,
                              'project-registration',
                              renderProjectTemplate(project)
                          )
                        : res.redirect(`/project/${req.params.slug}`)
            )
            .catch(() => res.redirect(`/project/${req.params.slug}`))
    );

    router.get('/projects', passwordless.restricted(), (req, res) => {
        db.Project.findAll({ where: { public: 1 } }).then(projects =>
            renderProjectPage(res, 'projects', { projects })
        );
    });

    router.get('/my-projects', passwordless.restricted(), (req, res) =>
        findProjectsByUserMember(res.locals.user).then(projects =>
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

    router.get('/project/create', passwordless.restricted(), (req, res) => {
        return renderProjectPage(res, 'project-registration', { project: {} });
    });

    router.get('/project/:slug', passwordless.restricted(), (req, res) =>
        findMemberBySlug([req.params.slug, req.user]).then(project =>
            renderProjectPage(res, 'project', renderProjectTemplate(project))
        )
    );

    router.get(
        '/project/:slug/submit',
        passwordless.restricted(),
        (req, res) => {
            findProjectBySlug(req.params.slug).then(project =>
                res.redirect(
                    '/project/' +
                    req.params.slug +
                    '/cycle/' +
                    project.Cycles[0].id + // most recent cycle
                        '/survey/new'
                )
            );
        }
    );

    router.get('/project/:slug/join', passwordless.restricted(), (req, res) =>
        findProjectBySlug(req.params.slug).then(project =>
            renderProjectPage(
                res,
                'project-join',
                renderProjectTemplate(project)
            )
        )
    );

    router.get('/project/:slug/maps', passwordless.restricted(), (req, res) =>
        findMemberBySlug([req.params.slug, req.user]).then(project =>
            db.Map.findAll({
                where: { projectId: project.id },
                order: [['name', 'ASC']]
            }).then(
                maps =>
                    isMemberOfProject(project)
                        ? renderProjectPage(
                              res,
                              'project-maps',
                              Object.assign(
                                  { maps },
                                  renderProjectTemplate(project)
                              )
                          )
                        : res.redirect(`/project/${req.params.slug}/join`)
            )
        )
    );

    router.get(
        '/project/:slug/membership/:id',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user]).then(
                project =>
                    findUserAsMemberOfProjectById([
                        req.params.id,
                        project
                    ]).then(membership =>
                        renderProjectPage(
                            res,
                            'project-membership',
                            Object.assign(
                                formatProjectMembership(membership),
                                renderProjectTemplate(project)
                            )
                        )
                    )
            )
    );

    router.get(
        '/project/:slug/members',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(project =>
                    findUserAsMemberOfProject([req.user, project, false]).then(
                        user =>
                            Object.assign(project, {
                                membership: parseMembership(user)
                            })
                    )
                )
                .then(project =>
                    db.User.findAll({
                        include: [
                            {
                                model: db.Membership,
                                where: {
                                    projectId: project ? project.get('id') : 0
                                }
                            }
                        ]
                    }).then(members =>
                        renderProjectPage(
                            res,
                            'project-members',
                            Object.assign(
                                { members: parseMemberships(members) },
                                renderProjectTemplate(project)
                            )
                        )
                    )
                )
                .catch(() => res.redirect(`/project/${req.params.slug}`))
    );

    router.get('/project/:slug/invite', passwordless.restricted(), (req, res) =>
        findProjectBySlugAndOwner([req.params.slug, res.locals.user])
            .then(project => {
                return renderProjectPage(
                    res,
                    'project-invite',
                    Object.assign({ project: parseProject(project) })
                );
            })
            .catch(() => res.redirect(`/project/${req.params.slug}`))
    );
    /*
    Invitation table:
        - invitation code (link)
        - option to email it direct from site, or copy/paste into email client
        - user clicks link, logs in with the email & joins project simultaneously
        - new user clicks link, is added to project and redirected to profile page?
    */

    router.get('/project/:slug/cycles', passwordless.restricted(), (req, res) =>
        findMemberBySlug([req.params.slug, req.user]).then(project =>
            db.Cycle.findAll({
                where: { projectId: project.id },
                order: [['start', 'DESC']]
            }).then(cycles =>
                renderProjectPage(
                    res,
                    'project-cycles',
                    Object.assign({ cycles }, renderProjectTemplate(project))
                )
            )
        )
    );

    router.get('/project/:slug/zones', passwordless.restricted(), (req, res) =>
        findMemberBySlug([req.params.slug, req.user]).then(project =>
            db.Zone.findAll({
                where: { projectId: project.id },
                order: [['code', 'ASC']]
            }).then(
                zones =>
                    isMemberOfProject(project)
                        ? renderProjectPage(
                              res,
                              'zones',
                              Object.assign(
                                  { zones },
                                  renderProjectTemplate(project)
                              )
                          )
                        : res.redirect(`/project/${req.params.slug}`)
            )
        )
    );

    router.get(
        '/project/:slug/zone/new',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(project =>
                    findUserAsMemberOfProject([req.user, project]).then(user =>
                        Object.assign(project, {
                            membership: parseMembership(user)
                        })
                    )
                )
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'zone-create',
                                  Object.assign(
                                      renderProjectTemplate(project),
                                      {
                                          zone: {}
                                      }
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(() => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/zone/:zoneId',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Zone.find({
                    where: { id: req.params.zoneId }
                }).then(zone =>
                    renderProjectPage(
                        res,
                        'zone',
                        Object.assign({ zone }, renderProjectTemplate(project))
                    )
                )
            )
    );

    router.get(
        '/project/:slug/zone/:zoneId/edit',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user])
                .then(project =>
                    db.Zone.find({
                        where: { id: req.params.zoneId }
                    }).then(
                        zone =>
                            isMemberOfProject(project)
                                ? renderProjectPage(
                                      res,
                                      'zone-create',
                                      Object.assign(
                                          { zone },
                                          renderProjectTemplate(project)
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                )
                .catch(err => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/cycle/:id/surveys',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlug(req.params.slug)
                .then(project =>
                    findUserAsMemberOfProject([req.user, project])
                        .then(user =>
                            Object.assign(project, {
                                membership: parseMembership(user)
                            })
                        )
                        .then(user =>
                            findCycleById(req.params.id).then(cycle =>
                                db.Survey.findAll({
                                    attributes: {
                                        include: [
                                            [
                                                db.Sequelize.fn(
                                                    'COUNT',
                                                    db.Sequelize.col(
                                                        'observations.id'
                                                    )
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
                                        cycleId: req.params.id,
                                        invalid: null
                                    },
                                    order: [['start', 'DESC']],
                                    group: ['Survey.id']
                                }).then(
                                    surveys =>
                                        isMemberOfProject(project)
                                            ? renderProjectPage(
                                                  res,
                                                  'surveys',
                                                  Object.assign(
                                                      {
                                                          projectSlug:
                                                              req.params.slug
                                                      },
                                                      renderProjectTemplate(
                                                          cycle.Project
                                                      ),
                                                      { cycle: cycle },
                                                      { surveys }
                                                  )
                                              )
                                            : res.redirect(
                                                  `/project/${req.params.slug}`
                                              )
                                )
                            )
                        )
                )
                .catch(err => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observations',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                findCycleById(req.params.cycleId).then(cycle =>
                    db.Observation.findAll({
                        where: { surveyId: req.params.surveyId, invalid: null },
                        attributes: {
                            include: [
                                [
                                    db.Sequelize.fn(
                                        'COUNT',
                                        db.Sequelize.col('files.id')
                                    ),
                                    'fileCount'
                                ]
                            ]
                        },
                        include: [
                            {
                                model: db.Survey,
                                where: { cycleId: req.params.cycleId },
                                required: true
                            },
                            db.File
                        ],
                        group: ['Observation.id']
                    }).then(
                        observations =>
                            isMemberOfProject(project)
                                ? renderProjectPage(
                                      res,
                                      'observations',
                                      Object.assign(
                                          { cycle },
                                          { observations },
                                          { surveyId: req.params.surveyId },
                                          renderProjectTemplate(cycle.Project)
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observation/new',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Survey.findOne({
                    where: {
                        cycleId: req.params.cycleId,
                        id: req.params.surveyId
                    }
                }).then(survey =>
                    renderProjectPage(
                        res,
                        'forms/turtle-watch-incident.ejs',
                        Object.assign(renderProjectTemplate(project), {
                            cycle: { id: req.params.cycleId },
                            survey
                        })
                    )
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/observation/:observationId/resubmit',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Survey.findOne({
                    where: {
                        cycleId: req.params.cycleId,
                        id: req.params.surveyId
                    }
                }).then(survey =>
                    renderProjectPage(
                        res,
                        'forms/turtle-watch-incident.ejs',
                        Object.assign(renderProjectTemplate(project), {
                            cycle: { id: req.params.cycleId },
                            survey,
                            resubmit: {
                                id: req.params.observationId
                            }
                        })
                    )
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Observation.findOne({
                    where: {
                        surveyId: req.params.surveyId,
                        id: req.params.observationId
                    },
                    attributes: {
                        include: [
                            [
                                db.Sequelize.fn(
                                    'COUNT',
                                    db.Sequelize.col('files.id')
                                ),
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
                }).then(
                    observation =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'observation',
                                  Object.assign(
                                      {
                                          cycleId: req.params.id,
                                          projectSlug: req.params.slug,
                                          observation
                                      },
                                      renderProjectTemplate(
                                          observation.Survey.Cycle.Project
                                      ),
                                      { review: false }
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/files',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Observation.findOne({
                    where: {
                        surveyId: req.params.surveyId,
                        id: req.params.observationId
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
                }).then(observation =>
                    db.File.findAll({
                        where: {
                            observationId: observation.id
                        }
                    }).then(
                        files =>
                            isMemberOfProject(project)
                                ? renderProjectPage(
                                      res,
                                      'files',
                                      Object.assign(
                                          {
                                              observation,
                                              files
                                          },
                                          renderProjectTemplate(
                                              observation.Survey.Cycle.Project
                                          )
                                      )
                                  )
                                : res.redirect(`/project/${req.params.slug}`)
                    )
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/upload',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Observation.findOne({
                    where: {
                        surveyId: req.params.surveyId,
                        id: req.params.observationId
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
                }).then(
                    observation =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'photo-upload',
                                  Object.assign(
                                      {
                                          observation,
                                          surveyId: req.params.surveyId,
                                          projectSlug: req.params.slug,
                                          cycleId: req.params.id
                                      },
                                      renderProjectTemplate(
                                          observation.Survey.Cycle.Project
                                      )
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/observation/:observationId/review',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Observation.findOne({
                    where: {
                        surveyId: req.params.surveyId,
                        id: req.params.observationId
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
                }).then(
                    observation =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'observation',
                                  Object.assign(
                                      {
                                          cycleId: req.params.id,
                                          projectSlug: req.params.slug,
                                          observation
                                      },
                                      renderProjectTemplate(
                                          observation.Survey.Cycle.Project
                                      ),
                                      { review: true }
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/new',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user])
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'forms/turtle-watch-survey.ejs',
                                  Object.assign(
                                      renderProjectTemplate(project),
                                      {
                                          cycle: { id: req.params.id }
                                      }
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(() => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/resubmit',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user])
                .then(
                    project =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'forms/turtle-watch-survey.ejs',
                                  Object.assign(
                                      renderProjectTemplate(project),
                                      {
                                          cycle: { id: req.params.id },
                                          resubmit: {
                                              id: req.params.surveyId
                                          }
                                      }
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(() => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId',
        passwordless.restricted(),
        (req, res) =>
            db.Survey.findOne({
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
                where: { cycleId: req.params.id, id: req.params.surveyId },
                include: [
                    {
                        model: db.Cycle,
                        include: [db.Project]
                    },
                    db.Observation
                ]
            }).then(survey =>
                findUserAsMemberOfProjectById([
                    res.locals.user.id,
                    survey.Cycle.Project,
                    true
                ]).then(
                    membership =>
                        membership
                            ? renderProjectPage(
                                  res,
                                  'survey',
                                  Object.assign(
                                      {
                                          survey,
                                          review: false
                                      },
                                      renderProjectTemplate(
                                          survey.Cycle.Project
                                      )
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
            )
    );

    router.get(
        '/project/:slug/cycle/:id/survey/:surveyId/review',
        passwordless.restricted(),
        (req, res) =>
            findMemberBySlug([req.params.slug, req.user]).then(project =>
                db.Survey.findOne({
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
                    where: { cycleId: req.params.id, id: req.params.surveyId },
                    include: [
                        {
                            model: db.Cycle,
                            include: [db.Project]
                        },
                        db.Observation
                    ]
                }).then(
                    survey =>
                        isMemberOfProject(project)
                            ? renderProjectPage(
                                  res,
                                  'survey',
                                  Object.assign(
                                      {
                                          survey,
                                          review: true
                                      },
                                      renderProjectTemplate(
                                          survey.Cycle.Project
                                      )
                                  )
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
            )
    );

    router.get(
        '/project/:slug/cycle/create',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(project =>
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
                .catch(err => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/map/add',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(project =>
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
                .catch(() => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/map/:id/edit',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(
                    project =>
                        project
                            ? findMapById(req.params.id).then(map =>
                                  renderProjectPage(res, 'map-add', { map })
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => res.redirect(`/project/${req.params.slug}`))
    );

    router.get(
        '/project/:slug/map/:id',
        passwordless.restricted(),
        (req, res) => {
            findMemberBySlug([req.params.slug, req.user])
                .then(project =>
                    findMapById(req.params.id).then(map =>
                        Object.assign(map, renderProjectTemplate(project))
                    )
                )
                .then(map =>
                    renderProjectPage(res, 'map', { map, project: map.project })
                );
        }
    );

    router.get(
        '/project/:slug/cycle/:id',
        passwordless.restricted(),
        (req, res) =>
            findCycleById(req.params.id).then(cycle =>
                renderProjectPage(res, 'cycle', { cycle })
            )
    );

    router.get(
        '/project/:slug/cycle/:id/edit',
        passwordless.restricted(),
        (req, res) =>
            findProjectBySlugAndOwner([req.params.slug, res.locals.user])
                .then(
                    project =>
                        project
                            ? findCycleById(req.params.id).then(cycle =>
                                  renderProjectPage(res, 'cycle-create', {
                                      cycle
                                  })
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => res.redirect(`/project/${req.params.slug}`))
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
            passwordless.restricted()
        ],
        function(req, res, next) {
            const errors = validationResult(req);
            console.log('errors', errors.mapped());
            // @todo: handle errors better
            if (!errors.isEmpty()) {
                renderProjectPage(res, 'cycle-create');
            } else {
                const cycleUpdate = matchedData(req);
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

    router.post(
        '/project/:slug/observation',
        [
            passwordless.restricted(),
            check('survey').exists(),
            check('cycle').exists(),
            check('incident_line').exists(),
            check('how_many').exists(),
            check('name_of_species').exists(),
            check('adult_size').optional(),
            check('immature_size').optional(),
            check('direction_of_travel').optional(),
            check('status_alive').optional(),
            check('status_dead').optional(),
            check('status_nesting').optional(),
            check('status_nest_protection_installed').optional(),
            check('status_predated').optional(),
            check('road').exists(),
            check('broken_eggs').optional(),
            check('pole_a').optional(),
            check('pole_b').optional(),
            check('gps').optional(),
            check('location_notes').optional(),
            check('location_garden_pile_one').optional(),
            check('location_garden_pile_two').optional(),
            check('location_hydro_fence_line').optional(),
            check('location_hydro_pile_one').optional(),
            check('location_hydro_pile_two').optional(),
            check('location_olympic_pile').optional(),
            check('location_other').optional(),
            check('extra_notes').optional(),
            check('data_entry_notes').optional(),
            check('more_observations').optional(),
            check('resubmit').optional()
        ],
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
            const redirectToObservations = survey =>
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
                                          redirectToNewObservation
                                      ],
                                      [R.T, redirectToObservations]
                                  ])
                              )
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => console.error(err));
        }
    );

    router.post(
        '/project/:slug/survey',
        [
            passwordless.restricted(),
            check('cycle').exists(),
            check('route').exists(),
            check('date').exists(),
            check('names').exists(),
            check('start_time').exists(),
            check('end_time').exists(),
            check('temperature').exists(),
            check('weather_conditions_sunny').optional(),
            check('weather_conditions_part_sun').optional(),
            check('weather_conditions_cloudy').optional(),
            check('weather_conditions_light_rain').optional(),
            check('weather_conditions_heavy_rain').optional(),
            check('weather_conditions_rain_24h').optional(),
            check('extra_notes').exists(),
            check('data_entry_notes').exists(),
            check('tally_sheets').exists(),
            check('skip_observations').optional(),
            check('resubmit').optional()
        ],
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
                start: moment(data.date + ' ' + data.start_time).format(),
                end: moment(data.date + ' ' + data.end_time).format()
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
                        '/survey/new'
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
                                                original_cycle_id: survey.get('cycleId'),
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
        [passwordless.restricted(), check('invalidate').optional()],
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
                                R.pick(
                                    ['review'],
                                    observation.dataValues
                                ),
                                {
                                    invalid: true,
                                    data: Object.assign(
                                        JSON.parse(observation.get('data')),
                                        {
                                            __metadata: {
                                                original_id: observationId,
                                                original_survey_id: observation.get('surveyId'),
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
                            : res.redirect(`/project/${req.params.slug}`)
                )
                .catch(err => console.error(err));
        }
    );
};
