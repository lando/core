'use strict';

module.exports = message => ({
  title: 'docker-compose failed (containerd backend)',
  type: 'warning',
  detail: [
    `${message}`,
    'The containerd engine backend uses docker-compose with finch-daemon',
    'as the Docker API compatibility layer.',
    'Check that all services in your Landofile are compatible',
    'with the containerd backend.',
  ],
  url: 'https://docs.lando.dev/troubleshooting/containerd.html#docker-compose-failed',
});
