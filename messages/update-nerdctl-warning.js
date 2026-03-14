'use strict';

// checks to see if a setting is disabled
module.exports = ({version, update, link} = {}) => ({
  type: 'warning',
  title: 'Recommend updating NERDCTL',
  detail: [
    `You have version ${version || 'unknown'} but we recommend updating to ${update || 'the latest version'}.`,
    'In order to ensure the best stability and support we recommend you update',
    'by running the hidden "lando setup" command.',
  ],
  command: 'lando setup --skip-common-plugins',
  url: link,
});
