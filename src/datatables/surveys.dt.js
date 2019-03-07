const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const t = require('../helpers/text').text;
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;

const projectTypeSettings = require('../helpers/project-settings').settings;

const surveysDataTable = ({
    surveys,
    projectSlug,
    cycle,
    project,
    req,
    filter
}) => {
    const { locals } = req.app;

    const isMoreAssigned = count => (count > 1 ? ` + ${count - 1}` : ``);

    const dtHeader = [
        '#',
        'Start',
        'End',
        'Location',
        'View',
        t('Observations', project),
        'Assignments',
        'Submitted by',
        'Submission date'
    ];

    const dtSource = surveys.reduce(
        (acc, survey) => {
            if (filter) {
                if (filter === 'needs_review') {
                    if (survey.get('reviewCount')) {
                        return acc;
                    }
                }
                if (filter === 'needs_assignment') {
                    if (survey.get('assignmentCount')) {
                        return acc;
                    }
                }
            }

            return acc.concat([
                [
                    survey.id,
                    moment(survey.start).format('MMM Do YYYY, h:mm a'),
                    moment(survey.end).format('MMM Do YYYY, h:mm a'),
                    survey.Zone
                        ? `${survey.Zone.code}) ` + trunc(survey.Zone.name, 35)
                        : '',
                    `<a href="/project/${projectSlug}/cycle/${
                        cycle.id
                    }/survey/${
                        survey.id
                    }" class="pure-button button-table-action button-small small-caps">View</a>`,
                    `<a href="/project/${projectSlug}/cycle/${
                        cycle.id
                    }/survey/${
                        survey.id
                    }/observations" class="pure-button button-table-action button-small small-caps" style="width: 11em;">${survey.get(
                        'observationCount'
                    )} ${t('records', project)}</a>`,
                    `<a href="/project/${projectSlug}/cycle/${
                        cycle.id
                    }/survey/${
                        survey.id
                    }/assignments" class="pure-button button-table-action button-small small-caps" style="width: 11em;">${
                        survey.Assignments[0]
                            ? survey.Assignments[0].User.get('firstName') +
                              ' ' +
                              survey.Assignments[0].User.get('lastName') +
                              isMoreAssigned(survey.get('assignmentCount'))
                            : 'Not ' + t('assigned', project)
                    }</a>`,
                    survey.author.firstName + ' ' + survey.author.lastName,
                    moment(survey.createdAt).format('MMM Do YYYY, h:mm a')
                ]
            ]);
        },
        [dtHeader]
    );

    const fullTable = DataTable.of(dtSource);

    const dt = fullTable.filterCols(str => {
        const exclude = R.pathOr(
            [],
            [project.model, 'surveys', 'excludeColumns'],
            projectTypeSettings
        );
        return !exclude.includes(str);
    });

    return dt;
};

module.exports = {
    surveysDataTable
};
