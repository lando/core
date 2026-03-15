'use strict';

module.exports = () => ({
  title: 'containerd is not running',
  type: 'warning',
  detail: [
    'The containerd daemon does not appear to be running.',
    'Try running "lando setup" to install and start containerd,',
    'or start it manually if already installed.',
    'Check ~/.lando/logs/containerd.log for details.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
