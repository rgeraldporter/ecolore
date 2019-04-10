// several here on "optional" as middleware seems to sometimes go out of order and labelfiles might or might not be still there
const observations = {
    exists: [],
    optional: []
};

const surveys = {
    exists: [
        'zone',
        'cycle',
        'nesting_attempt',
        'species',
        'nest_status',
        'adult_status',
        'young_status',
        'management_activity'
    ],
    optional: [
        'eggs',
        'live_young',
        'dead_young',
        'cb_eggs',
        'cb_live_young',
        'cb_dead_young',
        'other_notes',
        'skip_observations',
        'eabl_eggs_blue',
        'eabl_eggs_white'
    ]
};

module.exports = { observations, surveys };
