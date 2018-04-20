//
// flow for Breeding Bird Survey
// 1
// Submit eBird list via URL (option to continue to observation form)
//   or
// Start time/end time (if valid) AND then continue to an observation form


const observations = {
    exists: [],
    optional: []
};

const surveys = {
    exists: ['ebird_checklist_url', 'cycle', 'skip_observations'],
    optional: [
        'off_leash',
        'off_leash_extra_notes',
        'habitat_threats',
        'other_notes',
        'resubmit',
        'form'
    ]
};

module.exports = { observations, surveys };
