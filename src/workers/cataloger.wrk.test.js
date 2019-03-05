const { catalogAudioFiles } = require('./cataloger.wrk');
const { Test } = require('falsifire');

// process is async with db dependencies, so needs to move to integration test

describe('The cataloger worker', () => {
    xit('should get some unit tests', (done) => {
        catalogAudioFiles(() => {
            expect(true).toBe(true);
            done();
        });
    });
});
