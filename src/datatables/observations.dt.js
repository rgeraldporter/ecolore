const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;

const projectTypeSettings = require('../helpers/project-settings').settings;

const observationsDataTable = ({
    observations,
    projectSlug,
    project,
    req,
    cycle
}) => {
    const isContrib =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner' ||
        project.memberRole === 'contributor';

    const isAdmin =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner';

    const hasLabels = R.pathOr(
        false,
        [project.model, 'observations', 'labelDownload'],
        projectTypeSettings
    );
    const noPhotos = R.pathOr(
        false,
        [project.model, 'observations', 'noPhotos'],
        projectTypeSettings
    );

    const dtHeader = [
        'View data',
        'Review',
        'Labels',
        t('Observation', project),
        'Species',
        'Photos'
    ];

    const buttonClass = `class="pure-button button-table-action button-small small-caps"`;

    const reviewsRow = observation =>
        observation.get('reviewCount')
            ? `<a href="/project/${projectSlug}/cycle/${cycle.id}/survey/${
                  observation.surveyId
              }/observation/${observation.id}/review" ${buttonClass}>
Reviews: ${observation.get('reviewCount')}</a>`
            : `<a href="/project/${projectSlug}/cycle/${cycle.id}/survey/${
                  observation.surveyId
              }/observation/${
                  observation.id
              }/review" ${buttonClass}>Review</a>`;

    const dtSource = observations.reduce(
        (acc, observation) => {
            const data = observation.data;
            const photosUrl = `/project/${project.slug}/cycle/${
                cycle.id
            }/survey/${observation.surveyId}/observation/${
                observation.id
            }/files`;

            const fileCount = observation.get('fileCount');

            return acc.concat([
                [
                    `<a href="/project/${projectSlug}/cycle/${
                        cycle.id
                    }/survey/${observation.surveyId}/observation/${
                        observation.id
                    }" ${buttonClass}>View</a>`,
                    reviewsRow(observation),
                    `<a href="/project/${projectSlug}/cycle/${
                        cycle.id
                    }/survey/${observation.surveyId}/observation/${
                        observation.id
                    }/audacity-labels" ${buttonClass}>Audacity label file</a>`,
                    data.incident_line ||
                        moment(data.time).format('YYYY-MM-DD HH:mm:ss.SSS'),
                    data.name_of_species || data.labelText,
                    observation.get('fileCount')
                        ? `<a href="${photosUrl}">${fileCount} photo${
                              fileCount > 1 ? 's' : ''
                          }</a>`
                        : ''
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
        });

    return dt;
};

module.exports = {
    observationsDataTable
};
