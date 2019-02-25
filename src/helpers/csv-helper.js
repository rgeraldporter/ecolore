const { Maybe } = require('simple-maybe');
const fs = require('fs');
const formatPath = __dirname + '/../formats/';
const isFormatFile = path => fs.existsSync(formatPath + path);

const assembleCsv = ({ emptyObj, observations }) => {
    const csvData = observations.map(observation => {
        const meta = {
            'Start Time': observation.Survey.start,
            'End Time': observation.Survey.end,
            'Survey ID': observation.surveyId,
            'Observation ID': observation.id
        };
        const observationData = observation.data;
        const surveyData = observation.Survey.data;

        const assembleRow = metaCols => obsCols => surveyCols =>
            Object.assign(metaCols, obsCols, surveyCols);

        return Maybe.of(assembleRow)
            .ap(Maybe.of(meta))
            .ap(Maybe.of(observationData))
            .ap(Maybe.of(surveyData))
            .fork(console.error, a => a);
    });

    csvData.unshift(emptyObj);
    return csvData;
};

const findAllColumns = ({ project, observations }) => {
    // go through them all to find all columns possible
    let dataCols = observations.reduce((acc, observation) => {
        const observationData = observation.data;
        const surveyData = observation.Survey.data;
        const allData = Object.assign(surveyData, observationData);
        return acc.concat(Object.keys(allData));
    }, []);

    //make unique
    dataCols = [
        'Start Time',
        'End Time',
        'Survey ID',
        'Observation ID',
        ...new Set(dataCols)
    ];

    if (isFormatFile(`custom/${project.get('slug')}.format.js`)) {
        const formatCols = require(`${formatPath}custom/${project.get(
            'slug'
        )}.format.js`).columns;

        // find those not in format file, tack onto the end
        const diffCols = dataCols.filter(x => !formatCols.includes(x));
        dataCols = formatCols.concat(diffCols);
    }

    const emptyObj = {};
    dataCols.forEach(col => (emptyObj[col] = null));
    return { emptyObj, observations };
};

const csvHeader = filename => ({
    'Content-disposition': `attachment; filename=${filename}.csv`,
    'Content-Type': 'text/csv'
});

module.exports = { assembleCsv, findAllColumns, csvHeader };
