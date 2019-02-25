const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;

const projectTypeSettings = require('../helpers/project-settings').settings;

const assignmentsDataTable = ({
    assignments,
    surveyId,
    cycleId,
    projectSlug,
    project,
    req
}) => {

    const dtHeader = [
        'Assignee',
        'Status',
        'Assigned at',
    ];

    const buttonClass = `class="pure-button button-table-action button-small small-caps"`;

    const dtSource = assignments.reduce(
        (acc, assignment) => {
            const data = assignment.data;

            return acc.concat([
                [
                    assignment.User.firstName + ' ' + assignment.User.lastName,
                    assignment.role,
                    assignment.createdAt
                ]
            ]);
        },
        [dtHeader]
    );

    const fullTable = DataTable.of(dtSource);

    /*const dt = fullTable
        .filterCols(str => {
            const exclude = R.pathOr(
                [],
                [project.model, 'observations', 'excludeColumns'],
                projectTypeSettings
            );
            return !exclude.includes(str);
        })
        .filterCols(str => {
            const exclude = hasLabels ? [] : ['Labels'];
            return !exclude.includes(str);
        })
        .filterCols(str => {
            const exclude = noPhotos ? ['Photos'] : [];
            return !exclude.includes(str);
        })
        .filterCols(str => {
            const exclude = isAdmin ? [] : ['Review'];
            return !exclude.includes(str);
        });*/

    return fullTable;
};

module.exports = {
    assignmentsDataTable
};
