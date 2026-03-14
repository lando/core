'use strict';

module.exports = message => ({
  title: 'nerdctl compose failed',
  type: 'warning',
  detail: [
    `${message}`,
    'nerdctl compose is used as the Docker Compose alternative',
    'for the containerd engine backend.',
    'Check that all services in your Landofile are compatible',
    'with nerdctl compose.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
