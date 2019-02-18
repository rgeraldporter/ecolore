const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;
const isUrl = require('is-url');

const projectTypeSettings = require('../helpers/project-settings').settings;

const hasLineBreaks = text => (text.match(/\n/g) || []).length;
const buttonClass = `class="pure-button button-table-action button-small small-caps"`;
const toUrl = text => (isUrl(text) ? md.render(`[${text}](${text})`) : text);
const toMd = text => (hasLineBreaks(text) ? md.render(text) : toUrl(text));
const noData = () => '[no data]';
const identity = (x) => x;

const detectType = (key, data, survey) => {
    const condTable = ([key, data]) => [
        [typeof data[key] === 'string' && data[key], toMd, data[key]],
        [typeof data[key] === 'number' && data[key], identity, data[key]],
        [true, noData, null]
    ];

    const result = condTable([key, data]).find(a => a[0]);
    return result[1](result[2]);
};

const observationDataTable = ({
    observation,
    projectSlug,
    project,
    req,
    cycleId,
    review
}) => {
    const isContrib =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner' ||
        project.memberRole === 'contributor';

    const isAdmin =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner';

    const archiveAudioLink = R.pathOr(
        false,
        [project.model, 'observations', 'archiveAudioLink'],
        projectTypeSettings
    );

    const noPhotos = R.pathOr(
        false,
        [project.model, 'observations', 'noPhotos'],
        projectTypeSettings
    );

    const noLineBasedReviews = R.pathOr(
        false,
        [project.model, 'observations', 'noLineBasedReviews'],
        projectTypeSettings
    );

    const dtHeader = ['Key', 'Value', 'Correct?'];

    const data = JSON.parse(observation.data);
    const surveyData = JSON.parse(observation.Survey.data);

    const buttonClass = `class="pure-button button-table-action button-small small-caps"`;

    const dtSource = Object.keys(data).reduce(
        (acc, key) => {
            return acc.concat([
                [key, detectType(key, data), `<input type="checkbox" required>`]
            ]);
        },
        [dtHeader]
    );

    const photosRow = [
        'photos',
        `<a ${review ? 'target="_blank" ' : ''} href="/project/${
            project.slug
        }/cycle/${observation.Survey.Cycle.id}/survey/${
            observation.Survey.id
        }/observation/${observation.id}/files">Show all ${observation.get(
            'fileCount'
        )} photos ${review ? '(opens new window)' : ''}</a>`,
        `<input type="checkbox" required></input>`
    ];

    const filename = data.filename + '.wav';
    const startTime = data.startTime;

    const audioLinkRow = [
        'link',
        `<a target="_blank" href="${
            surveyData.archive_org_url
        }/${filename}?start=${startTime}">Listen</a>`,
        `<input type="checkbox" required></input>`
    ];

    const fullTable = DataTable.of(dtSource)
        .map(x => (archiveAudioLink ? x.concat([audioLinkRow]) : x))
        .map(x => (!noPhotos ? x.concat([photosRow]) : x));

    const dt = fullTable.filterCols(str => {
        const exclude = review && !noLineBasedReviews ? [] : ['Correct?'];
        return !exclude.includes(str);
    });

    return dt;
};

module.exports = {
    observationDataTable
};
