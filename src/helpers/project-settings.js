const settings = {
    'birdbox': {
        surveys: {
            excludeColumns: ['Start', 'End', 'Observations', 'Assignments', 'Review Coverage'],
            excludeRows: ['assignments']
        },
        menu: {
            hideObservationGo: true
        }
    },
    'turtle-watch': {
        surveys: {
            excludeColumns: ['Location', 'Assignments', 'Review Coverage'],
            excludeRows: ['assignments']
        },
        menu: {
            hideObservationGo: true
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
            labelDownload: true,
            hasIdentifications: true
        },
        menu: {
            hideSubmitData: true,
            hideSurveyGo: true
        }
    }
};

module.exports = { settings };
