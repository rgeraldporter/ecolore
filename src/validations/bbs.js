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
        'resubmit'
    ]
};

module.exports = { observations, surveys };
