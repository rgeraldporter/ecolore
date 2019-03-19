const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const fs = require('fs-extra');
const convert = require('xml-js');
const xml = require('xml');
const csv = require('csv-express');
const t = require('../../helpers/text').text;
const isViewFile = path => fs.existsSync(__dirname + '/../views/' + path);
const {
    parseProject,
    parseMembership
} = require('../../helpers/project-helper');

const { csvHeader } = require('../../helpers/csv-helper');

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));
const findAllIdentification = Future.encaseP(a => db.Identification.findAll(a));

const {
    identificationsDataTable
} = require('../../datatables/identifications.dt');

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

const identificationsEndpoint = (req, res) =>
    findMemberBySlugF([req.params.slug, req.user])
        .chain(project =>
            project.get('id')
                ? Future.of(project)
                : Future.reject('You are not a member of this project')
        )
        .chain(project =>
            Future.both(
                Future.of(project),
                findAllIdentification({
                    group: ['identifierId'],
                    attributes: [
                        'identifierId',
                        [
                            db.Sequelize.fn('COUNT', 'identifierId'),
                            'identifierCount'
                        ],
                        [
                            db.Sequelize.literal(
                                `(SELECT COUNT('identifierId') FROM Identifications WHERE Identifications.identifierId = Identifier.id AND JSON_EXTRACT(data, "$.uncertain") IS NOT NULL)`
                            ),
                            'identifierUncertainCount'
                        ],
                        [
                            db.Sequelize.literal(
                                `(SELECT COUNT('identifierId') FROM Identifications WHERE Identifications.identifierId = Identifier.id AND JSON_EXTRACT(data, "$.highQuality") IS NOT NULL)`
                            ),
                            'identifierHQCount'
                        ],
                    ],
                    order: [[db.Sequelize.literal('identifierCount'), 'DESC']],
                    include: [
                        {
                            model: db.Observation,
                            include: [
                                {
                                    model: db.Survey,
                                    include: [
                                        {
                                            model: db.Cycle,
                                            include: [
                                                {
                                                    model: db.Project,
                                                    where: {
                                                        id: project.get('id')
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        db.Identifier
                    ]
                })
            )
        );

module.exports = function(router) {
    router.get(
        '/project/:slug/identifications',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            identificationsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, identifications]) =>
                    renderProjectPage(
                        res,
                        'project-identifications',
                        Object.assign(
                            {
                                identifications,
                                urlPath: req.path,
                                dt: identificationsDataTable({
                                    identifications,
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
        '/project/:slug/identifications/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            identificationsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, identifications]) =>
                    identificationsDataTable({
                        identifications,
                        projectSlug: req.params.slug,
                        project: parseProject(project),
                        req
                    }).chain(table => {
                        res.csv(
                            table,
                            true,
                            csvHeader(
                                `${req.params.slug}_${t(
                                    'identifications',
                                    project
                                )}`
                            )
                        );
                    })
            )
    );

    router.get(
        '/project/:slug/identifications/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            identificationsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, identifications]) =>
                    identificationsDataTable({
                        identifications,
                        projectSlug: req.params.slug,
                        project: parseProject(project),
                        req
                    }).chain(table => res.json(table))
            )
    );
};
