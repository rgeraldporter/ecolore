const observations = {
    exists: [
        'survey',
        'cycle',
        'incident_line',
        'how_many',
        'name_of_species',
        'road'
    ],
    optional: [
        'adult_size',
        'immature_size',
        'direction_of_travel',
        'status_alive',
        'status_dead',
        'status_nesting',
        'status_nest_protection_installed',
        'status_predated',
        'broken_eggs',
        'pole_a',
        'pole_b',
        'gps',
        'location_notes',
        'location_garden_pile_one',
        'location_garden_pile_two',
        'location_hydro_fence_line',
        'location_hydro_pile_one',
        'location_hydro_pile_two',
        'location_olympic_pile',
        'location_other',
        'extra_notes',
        'data_entry_notes',
        'more_observations',
        'resubmit'
    ]
};

const surveys = {
    exists: [
        'cycle',
        'route',
        'date',
        'names',
        'start_time',
        'end_time',
        'temperature'
    ],
    optional: [
        'weather_conditions_sunny',
        'weather_conditions_part_sun',
        'weather_conditions_cloudy',
        'weather_conditions_light_rain',
        'weather_conditions_heavy_rain',
        'weather_conditions_rain_24h',
        'extra_notes',
        'data_entry_notes',
        'tally_sheets',
        'skip_observations',
        'resubmit'
    ]
};

module.exports = { observations, surveys };