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
const findAllCycle = Future.encaseP(a => db.Cycle.findAll(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));

const { cyclesDataTable } = require('../../datatables/cycles.dt');

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

const cyclesEndpoint = (req, res) =>
    findMemberBySlugF([req.params.slug, req.user])
        .chain(project =>
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
        );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycles',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            cyclesEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycles]) =>
                    renderProjectPage(
                        res,
                        'project-cycles',
                        Object.assign(
                            {
                                cycles,
                                urlPath: req.path,
                                dt: cyclesDataTable({
                                    cycles,
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
        '/project/:slug/cycles/csv',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            cyclesEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycles]) =>
                    cyclesDataTable({
                        cycles,
                        projectSlug: req.params.slug,
                        project: parseProject(project),
                        req
                    }).chain(table => {
                        res.csv(
                            table,
                            true,
                            csvHeader(
                                `${req.params.slug}_${t('cycles', project)}`
                            )
                        );
                    })
            )
    );

    router.get(
        '/project/:slug/cycles/json',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            cyclesEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, cycles]) =>
                    cyclesDataTable({
                        cycles,
                        projectSlug: req.params.slug,
                        project: parseProject(project),
                        req
                    }).chain(table => res.json(table))
            )
    );
};
