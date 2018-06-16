const { client } = require('nightwatch-cucumber');
const { Given, Then, When } = require('cucumber');

Given(/^we have browsed to the EcoLore site$/, () => {
  return client
    .url('http://127.0.0.1:3001')
    .waitForElementVisible('.splash-head', 5000)
});

When(/^we click on Log in \/ Sign up$/, () => {
  return client
    .waitForElementVisible('li.pure-menu-item:nth-child(2) > a:nth-child(1)', 5000)
    .click('li.pure-menu-item:nth-child(2) > a:nth-child(1)')
});

Then(/^we should be at the login page$/, () => {
  return client
  .waitForElementVisible('#form-login', 5000)
  .expect.element('#form-login').to.be.visible
});