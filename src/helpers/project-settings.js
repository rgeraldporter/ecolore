const settings = {
    'turtle-watch': {
        surveys: {
            excludeColumns: ['Location', 'Assignments'],
            excludeRows: ['assignments']
        }
    },
    'acoustic-survey': {
        surveys: {
            noReviews: false,
            noStart: false,
            noEnd: true,
            hasZone: true,
            noSubmissionDate: true,
            noLineBasedReviews: true,
            addObservationsColumn: true,
            doNotReviewObservationCount: true,
            excludeColumns: ['End', 'Submitted by', 'Submission date']
        },
        observations: {
            noReviews: false,
            noLineBasedReviews: true,
            noPhotos: true,
            archiveAudioLink: true,
            allowNewData: true,
            labelDownload: true
        },
        menu: {
            hideSubmitData: true
        }
    }
};

module.exports = { settings };
