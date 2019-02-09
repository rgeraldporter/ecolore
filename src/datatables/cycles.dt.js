const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;

const projectTypeSettings = require('../helpers/project-settings').settings;

const cyclesDataTable = ({ projectSlug, cycles, project, req }) => {
    const isContrib =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner' ||
        project.memberRole === 'contributor';

    const isAdmin =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner';

    const dtHeader = [
        t('Cycle', project),
        'Add',
        'Download',
        'Start',
        'End',
        'Edit'
    ];

    const buttonClass = `class="pure-button button-table-action button-small small-caps"`;

    const dtSource = cycles.reduce(
        (acc, cycle) => {
            return acc.concat([
                [
                    `<a href="/project/${project.slug}/cycle/${
                        cycle.id
                    }/surveys">${cycle.title}</a>`,
                    `<a href="/project/${project.slug}/cycle/${
                        cycle.id
                    }/survey/new" ${buttonClass}>${t('Add', project)}</a>`,
                    `<a href="/data/csv/cycle/${cycle.id}" ${buttonClass}>Download CSV</a>`,
                    moment(cycle.start).format('LL'),
                    moment(cycle.end).format('LL'),
                    `<a href='/project/${project.slug}/cycle/${
                        cycle.id
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
                [project.model, 'cycles', 'excludeColumns'],
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
    cyclesDataTable
};
