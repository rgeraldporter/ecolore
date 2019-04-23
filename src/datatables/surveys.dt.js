const { DataTable } = require('datatable-monad');
const { Maybe } = require('simple-maybe');
const moment = require('moment');
const R = require('ramda');
const t = require('../helpers/text').text;
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;

const projectTypeSettings = require('../helpers/project-settings').settings;

const surveysDataTable = ({
    surveys,
    surveysWithAcousticFiles,
    projectSlug,
    cycle,
    project,
    req,
    filter
}) => {
    const { locals } = req.app;

    const showScanned = scanned =>
        scanned
            ? `background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`
            : ``;

    const scannedOrUnreviewed = scanned =>
        scanned ? 'Scanned only' : 'Unreviewed';

    const isMoreAssigned = count => (count > 1 ? ` + ${count - 1}` : ``);
    const generateAcousticFileBoxes = acousticFiles =>
        acousticFiles
            .map(file =>
                file.get('reviewed')
                    ? R.propOr(false, 'nullFile', JSON.parse(file.get('data')))
                        ? `<div class="gray reviewed-box" data-tooltip="${file.get(
                              'name'
                          )}: Reviewed (null file)" data-tooltip-position="top"></div>`
                        : `<div class="green reviewed-box" data-tooltip="${file.get(
                              'name'
                          )}: Reviewed" data-tooltip-position="top"></div>`
                    : file.get('priority') > 0
                    ? `<div class="empty-high reviewed-box" data-tooltip="${file.get(
                          'name'
                      )}: ${scannedOrUnreviewed(
                          file.get('scanned')
                      )} (high priority)" data-tooltip-position="top" style="${showScanned(
                          file.get('scanned')
                      )}"></div>`
                    : `<div class="empty reviewed-box" data-tooltip="${file.get(
                          'name'
                      )}: ${scannedOrUnreviewed(
                          file.get('scanned')
                      )}" data-tooltip-position="top" style="${showScanned(
                          file.get('scanned')
                      )}"></div>`
            )
            .join('');

    const generatePercentReviewed = acousticFiles =>
        (acousticFiles.filter(file => file.get('reviewed')).length /
            acousticFiles.length) *
        100;

    const dtHeader = [
        '#',
        'Start',
        'End',
        'Location',
        'View',
        t('Observations', project),
        'Review Coverage',
        'Assignments',
        'Submitted by',
        'Submission date'
    ];

    const getSurveyFromAcousticList = surveyId =>
        surveysWithAcousticFiles.find(survey => survey.get('id') === surveyId);

    const getAcousticFiles = surveyId =>
        Maybe.of(getSurveyFromAcousticList(surveyId))
            .map(a => a.get('AcousticFiles'))
            .fork(_ => [], a => a);

    const dtSource = surveys.reduce(
        (acc, survey) => {
            const acousticFiles = getAcousticFiles(survey.get('id'));

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
                    moment(survey.start).format('MMM D, h:mm a'),
                    moment(survey.end).format('MMM D, h:mm a'),
                    survey.Zone
                        ? `${survey.Zone.code}) ` + trunc(survey.Zone.name, 25)
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
                    }/observations" class="pure-button button-table-action button-small small-caps" style="width: 9em;">${survey.get(
                        'observationCount'
                    )} ${t('records', project)}</a>`,
                    `<div style="max-width: 17em" class="tooltip">${generateAcousticFileBoxes(
                        acousticFiles
                    )}<span class="tooltiptext">
                        <div>
                        <div class="reviewed-tooltip-row"><div class="green reviewed-box reviewed-box-tooltip"></div>Reviewed with observations</div>
                        <div class="reviewed-tooltip-row"><div class="gray reviewed-box reviewed-box-tooltip"></div>Reviewed without observations</div>
                        <div class="reviewed-tooltip-row"><div class="empty reviewed-box reviewed-box-tooltip"></div>Unreviewed</div>
                        <div class="reviewed-tooltip-row"><div class="empty-medium reviewed-box reviewed-box-tooltip"></div>Unreviewed Priority File</div>
                        </div>
                    </span>
                    <meter max="100" data-tooltip="${generatePercentReviewed(
                        acousticFiles
                    ).toFixed(1)}% complete" value="${generatePercentReviewed(
                        acousticFiles
                    )}" title="${generatePercentReviewed(acousticFiles).toFixed(
                        1
                    )}% complete" style="width:100%; height: 8px; padding: 0;margin: 0" data-tooltip-position="top"></meter>
                    </div>
                    `,
                    `<a href="/project/${projectSlug}/cycle/${
                        cycle.id
                    }/survey/${
                        survey.id
                    }/assignments" class="pure-button button-table-action button-small small-caps" style="width: 10em;">${
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
