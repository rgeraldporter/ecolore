const { DataTable } = require('datatable-monad');
const moment = require('moment');
const R = require('ramda');
const trunc = (str, len) =>
    str.length > len ? str.substr(0, len) + '...' : str;
const t = require('../helpers/text').text;

const projectTypeSettings = require('../helpers/project-settings').settings;

const identificationsDataTable = ({
    projectSlug,
    identifications,
    project,
    req
}) => {
    const isContrib =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner' ||
        project.memberRole === 'contributor';

    const isAdmin =
        project.memberRole === 'administrator' ||
        project.memberRole === 'owner';

    const dtHeader = [t('Identification', project), 'Total', 'Uncertain', 'High Quality'];

    const buttonClass = `class="pure-button button-table-action button-small small-caps"`;

    const dtSource = identifications.reduce(
        (acc, identification) => {
            return acc.concat([
                [
                    `${
                        identification.Identifier
                            ? identification.Identifier.get('text')
                            : `<details><summary>Unidentified <small>(+expand)</small></summary><p><em>Unidentified</em> includes both <strong>unknown</strong> and labelled items that don't have a database identifier yet.</p></details>`
                    }`,
                    `<a href="/project/${projectSlug}/identifications/${
                        identification.get('identifierId')
                    }" ${buttonClass}>${identification.get('identifierCount')} Counted</a>`,
                    `<a href="/project/${projectSlug}/identifications/${
                        identification.get('identifierId')
                    }/uncertain" ${buttonClass}>${identification.get('identifierUncertainCount')} Uncertain</a>`,
                    `<a href="/project/${projectSlug}/identifications/${
                        identification.get('identifierId')
                    }/highQuality" ${buttonClass}>${identification.get('identifierHQCount')} High Quality</a>`
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
                [project.model, 'identifications', 'excludeColumns'],
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
    identificationsDataTable
};
