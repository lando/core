'use strict';

// checks to see if a setting is disabled
module.exports = service => ({
  title: `The service "${service}" is not running!`,
  type: 'error',
  detail: ['This is likely a critical problem and we recommend you run the command below to investigate'],
  command: `lando logs -s ${service}`,
});
