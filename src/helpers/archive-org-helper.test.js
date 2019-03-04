const {uploadToArchiveOrg} = require('./archive-org-helper');

describe('test s3!', () => {
    it('should try to upload to s3', (done) => {
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

const objKeyToHeaderKey = data => ({
    collection: data.collection,
    creator: data.creator,
    date: data.date,
    description: data.description,
    licenseurl: data.licenseurl,
    mediatype: data.mediatype,
    subject: data.subject,
    title: data.title,
    [prefixKey('upload-origin-host')]: process.env.HOST,
    [prefixKey('observation-id')]: data.observationId,
    [prefixKey('project-slug')]: data.projectSlug,
    [prefixKey('local-date-time')]: data.datetime,
    [prefixKey('location-code')]: data.locationCode,
    [prefixKey('location')]: data.location,
    [prefixKey('device-id')]: data.deviceId,
    [prefixKey('derived-from-filename')]: data.filename,
    [prefixKey('derived-from-archive-org-url')]: data.archiveUrl,
    [prefixKey('label-text')]: data.labelText,
    [prefixKey('identification-text')]: data.identification,
    [prefixKey('identifier-user-name')]: data.submitterName,
    [prefixKey('frequency-floor')]: data.frequencyFloor,
    [prefixKey('frequency-ceiling')]: data.frequencyCeiling,
    [prefixKey('duration')]: data.duration
});