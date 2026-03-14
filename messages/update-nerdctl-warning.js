'use strict';

// checks to see if a setting is disabled
module.exports = () => ({
  type: 'warning',
  title: 'Recommend updating NERDCTL',
  detail: [
    'Looks like you might be falling a bit behind on nerdctl.',
    'In order to ensure the best stability and support we recommend you update',
    'by running the hidden "lando setup" command.',
  ],
  command: 'lando setup --skip-common-plugins',
});
