'use strict';

// checks to see if a setting is disabled
module.exports = ({
  title: 'You have a lot of keys!',
  type: 'tip',
  detail: [
    'Lando has detected you have a lot of ssh keys.',
    'This may cause "Too many authentication failures" errors.',
    'We recommend you limit your keys. See below for more details:',
  ],
  url: 'https://docs.lando.dev/config/ssh.html#customizing',
});
