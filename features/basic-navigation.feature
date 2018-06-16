Feature: Basic Unauthenticated Navigations

Scenario: Main pages
 Given we have browsed to the EcoLore site
  When we click on Log in / Sign up
  Then we should be at the login page