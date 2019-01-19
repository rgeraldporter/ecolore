const settings = {
    'acoustic-survey': {
        surveys: {
            noReviews: true,
            noStart: false,
            noEnd: true,
            hasZone: true,
            noSubmissionDate: true,
            addObservationsColumn: true
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