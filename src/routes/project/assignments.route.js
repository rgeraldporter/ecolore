const passwordless = require('passwordless');
const R = require('ramda');
const db = require('../../models/index');
const Future = require('fluture');
const { assignmentsDataTable } = require('../../datatables/assignments.dt');

const {
    parseProject,
    parseMembership
} = require('../../helpers/project-helper');

const isMemberOfProject = project =>
    R.path(['membership', 'role'], project) !== 'none';

const findOneProject = Future.encaseP(a => db.Project.findOne(a));
const findAllAssignments = Future.encaseP(a => db.Assignment.findAll(a));
const findOneUser = Future.encaseP(a => db.User.findOne(a));

const renderProjectPage = (res, name, values = {}) =>
    res.render(
        name,
        Object.assign(values, { section: 'project', user: res.locals.user })
    );

const renderProjectTemplate = project =>
    project ? { project: parseProject(project) } : { project: {} };

const findProjectBySlug = slug =>
    findOneProject({
        where: { slug },
        include: [{ model: db.Cycle, order: [['start', 'DESC']] }]
    });

const findUserAsMemberOfProject = ([email, project, required = true]) =>
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

const findMemberBySlug = ([slug, userEmail]) =>
    findProjectBySlug(slug)
        .chain(project =>
            Future.both(
                Future.of(project),
                findUserAsMemberOfProject([userEmail, project, false])
            )
        )
        .map(([project, user]) =>
            Object.assign(project, {
                membership: parseMembership(user)
            })
        );

const findAssignmentsBySurveyId = surveyId =>
    findAllAssignments({
        where: { surveyId },
        include: [
            {
                model: db.Survey,
                include: [db.Cycle]
            },
            db.User
        ]
    });

const assignmentsEndpoint = (req, res) =>
    findMemberBySlug([req.params.slug, req.user])
        .chain(project =>
            Future.both(
                Future.of(project),
                findAssignmentsBySurveyId(req.params.surveyId)
            )
        )
        // verify it is part of the correct project
        .chain(([project, assignments]) =>
            !project.Cycles.find(
                cycle =>
                    Number(cycle.dataValues.id) === Number(req.params.cycleId)
            )
                ? Future.reject('Survey not part of this project')
                : Future.of([project, assignments])
        )
        .chain(([project, assignments]) =>
            isMemberOfProject(project)
                ? Future.of([project, assignments])
                : Future.reject('Not a member of this project')
        );

const assignmentsNewEndpoint = (req, res) =>
    assignmentsEndpoint(req, res).fork(
        _ => res.redirect(`/project/${req.params.slug}`),
        ([project, assignments]) =>
            db.Assignment.create({
                userId: res.locals.user.id,
                surveyId: req.params.surveyId,
                role: 'assigned'
            }).then(() =>
                res.redirect(
                    `/project/${req.params.slug}/cycle/${
                        req.params.cycleId
                    }/survey/${req.params.surveyId}/assignments`
                )
            )
    );

module.exports = function(router) {
    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/assignments/new',
        passwordless.restricted({ failureRedirect: '/login' }),
        assignmentsNewEndpoint
    );

    router.get(
        '/project/:slug/cycle/:cycleId/survey/:surveyId/assignments',
        passwordless.restricted({ failureRedirect: '/login' }),
        (req, res) =>
            assignmentsEndpoint(req, res).fork(
                _ => res.redirect(`/project/${req.params.slug}`),
                ([project, assignments]) =>
                    renderProjectPage(
                        res,
                        'assignments',
                        Object.assign(
                            {
                                assignments,
                                surveyId: req.params.surveyId,
                                urlPath: req.path,
                                cycleId: req.params.cycleId,
                                user: res.locals.user,
                                dt: assignmentsDataTable({
                                    assignments,
                                    cycleId: req.params.cycleId,
                                    surveyId: req.params.surveyId,
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
};
