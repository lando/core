'use strict';

module.exports = () => ({
  title: 'containerd requires elevated permissions',
  type: 'error',
  detail: [
    'containerd requires elevated permissions to run.',
    'On Linux, add your user to the appropriate group',
    'or run with sudo.',
    'Check ~/.lando/logs/containerd.log for permission errors.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
