const { flagReviewedAcousticFiles } = require('./reviewer.wrk');
const { Test } = require('falsifire');

// process is async with db dependencies, so needs to move to integration test

describe('The reviewer worker', () => {
    xit('should get some integration tests', (done) => {
        flagReviewedAcousticFiles((reason) => {
            console.error('err?', reason);
            expect(true).toBe(true);
            done();
        });
    });
});
