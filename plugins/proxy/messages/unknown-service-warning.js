'use strict';

module.exports = service => ({
  title: 'Proxying to unknown service!',
  type: 'warning',
  detail: [
    `${service} is a service that does not exist in your app!!!`,
    'This means we have not been able to set up your proxy route',
    'We recommend running the below command to see the services for this app',
  ],
  command: `lando info`,
});
