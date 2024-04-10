'use strict';

// checks to see if a setting is disabled
module.exports = ({os}) => ({
  type: 'warning',
  title: 'Recommend updating DOCKER DESKTOP',
  detail: [
    'Looks like you might be falling a bit behind on Docker Desktop.',
    'In order to ensure the best stability and support we recommend you update',
    'by launching Docker Desktop and updating through their app.',
  ],
  url: `https://docs.docker.com/desktop/settings/${os}/#software-updates`,
});
