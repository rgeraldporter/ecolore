const {uploadToArchiveOrg} = require('./archive-org-helper');

// todo: move to integration test

describe('test s3!', () => {
    xit('should try to upload to s3', (done) => {
        uploadToArchiveOrg({
            data: {
                collection: 'test_collection',
                creator: 'Hamilton Naturalists\' Club',
                date: '2019/02/01',
                description: 'A description here!',
                licenseurl: 'https://creativecommons.org/licenses/by/4.0/',
                mediatype: 'audio',
                subject: 'Test item; Hamilton, Ontario; nature; American Crow',
                title: '[TEST]American Crow, February 1, 2019',
                observationId: 861222,
                projectSlug: 'hamont-bio',
                datetime: '2019-02-01 12:00:05',
                locationCode: 'A2',
                location: 'McMaster Forest',
                deviceId: 'HNCSW1',
                filename: 'HNCSW1_02012019120000',
                archiveUrl: 'https://archive.org/details/more-testing-rob-deleteme-10222',
                labelText: "AMCR",
                identification: 'American Crow',
                submitterName: 'Rob Porter',
                frequencyFloor: 1200,
                frequencyCeiling: 12090,
                duration: 4.5,
                clipFilename: 'hamont-bioacoustic-observation-2145-spectrogram.png'
            },
            filePath: '/Users/rob/git/ecolore/temp/hamont-bioacoustic-observation-2145-spectrogram.png'
        }).then((response) => {
            console.log('stuff', response);
            done();
        });
    }, 250000);
});