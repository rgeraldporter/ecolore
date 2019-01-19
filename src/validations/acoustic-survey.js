const observations = {
    exists: ['observations', 'filenames', 'survey', 'cycle'],
    optional: ['more_observations']
};

const surveys = {
    exists: ['cycle', 'archive_org_url', 'date', 'start_time'],
    optional: ['form', 'resubmit']
};

module.exports = { observations, surveys };
