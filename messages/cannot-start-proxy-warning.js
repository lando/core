'use strict';

module.exports = message => ({
  title: 'Lando was not able to start the proxy',
  type: 'warning',
  detail: [
    `${message}`,
    'The proxy has been disabled for now so you can continue to work.',
    'Check out the docs below, resolve your issue and build this app',
  ],
  url: 'https://docs.lando.dev/config/proxy.html',
});
