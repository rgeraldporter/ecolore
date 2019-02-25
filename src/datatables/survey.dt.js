const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;
const isUrl = require('is-url');
const md = require('markdown-it')({
    linkify: true
});

const projectTypeSettings = require('../helpers/project-settings').settings;

const hasLineBreaks = text => (text.match(/\n/g) || []).length;
const buttonClass = `class="pure-button button-table-action button-small small-caps"`;
const toUrl = text => (isUrl(text) ? md.render(`[${text}](${text})`) : text);
const toMd = text => (hasLineBreaks(text) ? md.render(text) : toUrl(text));
const noData = () => '[no data]';
const detectField = ({ key, data, survey }) =>
    key === 'zone' ? survey.Zone.name : data[key];

const detectType = (key, data, survey) => {
    const condTable = ([key, data]) => [
        [data[key] && !isNaN(data[key]), detectField, { key, data, survey }],
        [data[key] && typeof data[key] === 'string', toMd, data[key]],
        [true, noData, null]
    ];

    const result = condTable([key, data]).find(a => a[0]);
    return result[1](result[2]);
};

const surveyDataTable = ({ survey, projectSlug, project, req, review }) => {
    const isContrib =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner' ||
        project.memberRole === 'contributor';

    const isAdmin =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner';

    const noLineBasedReviews = R.pathOr(
        false,
        [project.model, 'surveys', 'noLineBasedReviews'],
        projectTypeSettings
    );

    const doNotReviewObservationCount = R.pathOr(
        false,
        [project.model, 'surveys', 'doNotReviewObservationCount'],
        projectTypeSettings
    );

    const rowExclusions = R.pathOr(
        [],
        [project.model, 'surveys', 'excludeRows'],
        projectTypeSettings
    );

    const excludeAssignments = rowExclusions.includes('assignments');

    const dtHeader = ['Key', 'Value', 'Correct?'];

    const data = survey.data;

    const dtSource = Object.keys(data).reduce(
        (acc, key) => {
            return acc.concat([
                [
                    key,
                    detectType(key, data, survey),
                    `<input type="checkbox" required>`
                ]
            ]);
        },
        [dtHeader]
    );

    const observationsRow = [
        t('observations', project),
        `<a ${review ? 'target="_blank" ' : ''} href="/project/${
            project.slug
        }/cycle/${survey.Cycle.id}/survey/${
            survey.id
        }/observations">Show all ${survey.get('observationCount')} ${t(
            'observations',
            project
        )} ${review ? '(opens new window)' : ''}</a>`,
        doNotReviewObservationCount
            ? ''
            : `<input type="checkbox" required></input>`
    ];

    const assignmentsRow = excludeAssignments
        ? []
        : [
              t('assignments', project),
              `<a href="/project/${project.slug}/cycle/${
                  survey.Cycle.id
              }/survey/${
                  survey.id
              }/assignments" class="pure-button button-table-action button-small small-caps" style="width: 11em;">${survey.get(
                  'assignmentCount'
              )} ${t('assigned', project)}</a>`
          ];

    const fullTable = DataTable.of(dtSource)
        .append(observationsRow)
        .append(assignmentsRow);

    const dt = fullTable.filterCols(str => {
        const exclude = review && !noLineBasedReviews ? [] : ['Correct?'];
        return !exclude.includes(str);
    });

    return dt;
};

module.exports = {
    surveyDataTable
};
