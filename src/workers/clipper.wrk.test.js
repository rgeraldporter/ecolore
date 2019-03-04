const { clipAudioFile, getAcousticFiles } = require('./clipper.wrk');
const { Test } = require('falsifire');

describe('The clipper worker', () => {
    xit('should accept a file URL, observation entry', done => {
        const observation = {
            data: {
                startTime: 1553.88,
                duration: 30.12,
                filename: 'HNCSW1_20190205_172027',
                frequencyFloor: 3000.342343,
                frequencyCeiling: 12832.12312,
                labelText: 'NOCA'
            },
            id: 123,
            surveyUrl: 'https://archive.org/download/HNCSW120190205/'
        };

        clipAudioFile({ observation }, results => {
            expect(true).toBe(true);
            done();
        });
    }, 1500000);

    xit('should download a clip if not present', done => {
        const observation = {
            data: {
                startTime: 576.6,
                duration: 130.212,
                filename: 'HNCSW1_20181215_164011',
                frequencyFloor: 576.6,
                frequencyCeiling: 704.4,
                labelText: 'CAGO 15'
            },
            id: 2145,
            surveyUrl: 'https://archive.org/download/HNCSW120181215/'
        };

        clipAudioFile({ observation }, results => {
            expect(true).toBe(true);
            done();
        });
    }, 1500000);

    xit('should handle failed downloads gracefully', done => {
        const observation = {
            data: {
                startTime: 123,
                duration: 2,
                filename: 'HNCSW1_20190205_140021',
                frequencyFloor: 3000,
                frequencyCeiling: 6500,
                labelText: 'AMCR'
            },
            id: 10,
            surveyUrl: 'https://archive.org/download/HNCSW120190205/'
        };

        clipAudioFile({ observation }, results => {
            expect(true).toBe(true);
            done();
        });
    }, 1500000);

    it('should be able to list off ', done => {
        getAcousticFiles(() => {
            expect(true).toBe(true);
            done();
        });
    }, 1500000);
});
