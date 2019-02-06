const settings = {
    'acoustic-survey': {
        surveys: {
            noReviews: false,
            noStart: false,
            noEnd: true,
            hasZone: true,
            noSubmissionDate: true,
            addObservationsColumn: true,
            doNotReviewObservationCount: true
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

module.exports = {settings};