//
// flow for Breeding Bird Survey
// 1
// Submit eBird list via URL (option to continue to observation form)
//   or
// Start time/end time (if valid) AND then continue to an observation form


const observations = {
    exists: ['species_name', 'breeding_code', 'cycle', 'survey'],
    optional: ['notes', 'more_observations']
};

const surveys = {
    exists: ['date', 'start_time', 'end_time', 'names', 'cycle', 'skip_observations'],
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
