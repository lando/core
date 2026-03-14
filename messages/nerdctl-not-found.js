'use strict';

module.exports = () => ({
  title: 'nerdctl binary not found',
  type: 'error',
  detail: [
    'The nerdctl binary was not found at the expected path.',
    'nerdctl is required for the containerd engine backend.',
    'Run "lando setup" to install it.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
