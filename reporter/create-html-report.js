const reporter = require('cucumber-html-reporter');

const options = {
    theme: 'bootstrap',
    jsonFile: 'reports/cucumber.json',
    output: 'reports/cucumber.html',
    reportSuiteAsScenarios: true,
    launchReport: true,
    screenshotsDirectory: 'screenshots/'
};

reporter.generate(options);
