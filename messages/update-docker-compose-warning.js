'use strict';

// checks to see if a setting is disabled
module.exports = () => ({
  type: 'warning',
  title: 'Recommend updating DOCKER COMPOSE',
  detail: [
    'Looks like you might be falling a bit behind on Docker Compose.',
    'In order to ensure the best stability and support we recommend you update',
    'by running the hidden "lando setup" command.',
  ],
  command: 'lando setup --skip-common-plugins',
});
