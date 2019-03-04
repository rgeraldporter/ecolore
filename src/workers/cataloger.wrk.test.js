const { catalogAudioFiles } = require('./cataloger.wrk');
const { Test } = require('falsifire');

describe('The cataloger worker', () => {
    it('should get some unit tests', (done) => {
        catalogAudioFiles(() => {
            expect(true).toBe(true);
            done();
        });
    });
});
