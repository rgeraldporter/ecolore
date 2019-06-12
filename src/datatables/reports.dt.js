const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;
const { $String } = require('monastery-monads');

const projectTypeSettings = require('../helpers/project-settings').settings;

const reportsDataTable = ({ projectSlug, reports, project, req }) => {
    const isContrib =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner' ||
        project.memberRole === 'contributor';

    const isAdmin =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner';

    const dtHeader = [t('Report', project), 'Title', 'Created At', 'Edit'];

    const openAnchorTag = link => `<a href="${link}">`;
    const closeAnchorTag = () => '</a>';
    const buttonClass = `class="pure-button button-table-action button-small small-caps"`;

    const reportUrl = report => $String
        .of('/project/')
        .append(project.slug)
        .append('/report/')
        .append(report.id);

    const reportLink = report =>
        reportUrl(report)
            .map(openAnchorTag)
            .append('Report for Cycle ID #')
            .append(report.cycleId)
            .map(closeAnchorTag)
            .emit();

    const dtSource = reports.reduce(
        (acc, report) => {
            return acc.concat([
                [
                    reportLink(report),
                    moment(report.createdAt).format('LL'),
                    `<a href='/project/${project.slug}/report/${
                        report.id
                    }/edit' ${buttonClass}>Edit</a>`
                ]
            ]);
        },
        [dtHeader]
    );

    const fullTable = DataTable.of(dtSource);

    const dt = fullTable
        .filterCols(str => {
            const exclude = R.pathOr(
                [],
                [project.model, 'reports', 'excludeColumns'],
                projectTypeSettings
            );
            return !exclude.includes(str);
        })
        .filterCols(str => {
            const exclude = isAdmin ? [] : ['Edit'];
            return !exclude.includes(str);
        })
        .filterCols(str => {
            const exclude = isContrib ? [] : ['Add'];
            return !exclude.includes(str);
        });

    return dt;
};

module.exports = {
    reportsDataTable
};
