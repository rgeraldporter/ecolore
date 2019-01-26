const { assembleCsv, findAllColumns } = require('./csv-helper');
const { Test } = require('falsifire');

const dataCols = [
    'Start Time',
    'End Time',
    'Survey ID',
    'Observation ID',
    'my_data_col_1',
    'my_data_col_2',
    'something'
];

const emptyDataCols = {
    'End Time': null,
    'Observation ID': null,
    'Start Time': null,
    'Survey ID': null,
    my_data_col_1: null,
    my_data_col_2: null,
    something: null
};

const observationsPassing = [
    {
        Survey: {
            start: 'Thu Jan 03 2019 00:00:00 GMT+0000 (UTC)',
            end: '',
            data: JSON.stringify({
                something: 1
            })
        },
        surveyId: 60,
        id: 10,
        data: JSON.stringify({
            my_data_col_1: 1111,
            my_data_col_2: 'aaaa'
        })
    },
    {
        Survey: {
            start: 'Thu Jan 04 2019 00:00:00 GMT+0000 (UTC)',
            end: 'Thu Jan 05 2019 00:00:00 GMT+0000 (UTC)',
            data: JSON.stringify({
                something: 1
            })
        },
        surveyId: 61,
        id: 101,
        data: JSON.stringify({
            my_data_col_1: 11112,
            my_data_col_2: 'aaaab'
        })
    },
    {
        Survey: {
            start: 'Thu Jan 06 2019 00:00:00 GMT+0000 (UTC)',
            end: 'Thu Jan 08 2019 00:00:00 GMT+0000 (UTC)',
            data: JSON.stringify({
                something: 1
            })
        },
        surveyId: 610,
        id: 1011,
        data: JSON.stringify({
            my_data_col_1: 111212,
            my_data_col_2: 'aa2aab'
        })
    }
];

const observationsFailing = [
    {
        Survey: {
            start: 'Thu Jan 03 2019 00:00:00 GMT+0000 (UTC)',
            end: '',
            data: JSON.stringify({
                something: 1
            })
        },
        surveyId: 60,
        id: 10,
        data: JSON.stringify({
            my_data_col_1: 1111,
            my_data_col_2: 'aaaa'
        })
    }
];

const observationsFailing2 = observationsPassing.slice(0, -1);

const project = {
    get(str) {
        return 'no-project';
    }
};

describe('The CSV Helper', () => {
    it('can assemble a CSV when given columns and data', () => {
        const emptyObj = {};
        dataCols.forEach(col => (emptyObj[col] = null));

        Test.of(assembleCsv)
            .passing([[{ emptyObj, observations: observationsPassing }]])
            .failing([
                [{ emptyObj, observations: observationsFailing }],
                [{ emptyObj, observations: observationsFailing2 }],
            ])
            .expecting(csvData =>
                expect(csvData).toEqual([
                    {
                        'End Time': null,
                        'Observation ID': null,
                        'Start Time': null,
                        'Survey ID': null,
                        my_data_col_1: null,
                        my_data_col_2: null,
                        something: null
                    },
                    {
                        'End Time': '',
                        'Observation ID': 10,
                        'Start Time': 'Thu Jan 03 2019 00:00:00 GMT+0000 (UTC)',
                        'Survey ID': 60,
                        my_data_col_1: 1111,
                        my_data_col_2: 'aaaa',
                        something: 1
                    },
                    {
                        'End Time': 'Thu Jan 05 2019 00:00:00 GMT+0000 (UTC)',
                        'Observation ID': 101,
                        'Start Time': 'Thu Jan 04 2019 00:00:00 GMT+0000 (UTC)',
                        'Survey ID': 61,
                        my_data_col_1: 11112,
                        my_data_col_2: 'aaaab',
                        something: 1
                    },
                    {
                        'End Time': 'Thu Jan 08 2019 00:00:00 GMT+0000 (UTC)',
                        'Observation ID': 1011,
                        'Start Time': 'Thu Jan 06 2019 00:00:00 GMT+0000 (UTC)',
                        'Survey ID': 610,
                        my_data_col_1: 111212,
                        my_data_col_2: 'aa2aab',
                        something: 1
                    }
                ])
            );
    });

    it('can find the columns given database results', () => {
        Test.of(findAllColumns)
            .passing([[{ project, observations: observationsPassing }]])
            .failing([
                [{ project, observations: observationsFailing }],
                [{ project, observations: observationsFailing2 }],
            ])
            .expecting(({ emptyObj, observations }) =>
                expect({ emptyObj, observations }).toEqual({
                    emptyObj: emptyDataCols,
                    observations: observationsPassing
                })
            );
    });
});
