// several here on "optional" as middleware seems to sometimes go out of order and labelfiles might or might not be still there
const observations = {
    exists: ['survey', 'cycle'],
    optional: ['more_observations', 'labelfiles', 'observations', 'filenames', 'scanned']
};

const surveys = {
    exists: ['cycle', 'archive_org_url', 'date', 'start_time', 'zone'],
    optional: ['form', 'resubmit', 'skip_observations']
};

module.exports = { observations, surveys };
