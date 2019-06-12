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
const findAllReport = Future.encaseP(a => db.Report.findAll(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));

const { reportsDataTable } = require('../../datatables/reports.dt');

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

const reportsEndpoint = (req, res) =>
    findMemberBySlugF([req.params.slug, req.user])
        .chain(project =>
            project.get('id')
                ? Future.of(project)
                : Future.reject('You are not a member of this project')
        )
        .chain(project =>
            Future.both(
                Future.of(project),
                findAllReport({
                    include: [
                        {
                            model: db.Cycle,
                            where: { projectId: R.prop('id', project) }
                        }
                    ],
                    order: [['createdAt', 'DESC']]
                })
            )
        );

const doRenderReports = (req, res) => ([project, reports]) =>
    renderProjectPage(
        res,
        'project-reports',
        Object.assign(
            {
                reports,
                urlPath: req.path,
                dt: reportsDataTable({
                    reports,
                    projectSlug: req.params.slug,
                    project: parseProject(project),
                    req
                })
            },
            renderProjectTemplate(project)
        )
    );

module.exports = function(router) {
    router.get(
        '/project/:slug/reports',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            reportsEndpoint(req, res).fork(_ => {
                console.log('ERRRRRR', _);
                return res.redirect(`/project/${req.params.slug}`);
            }, doRenderReports(req, res))
    );
};
