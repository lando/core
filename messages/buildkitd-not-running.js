'use strict';

module.exports = () => ({
  title: 'BuildKit daemon is not running',
  type: 'warning',
  detail: [
    'The BuildKit daemon (buildkitd) is not running.',
    'BuildKit is required for building container images with containerd.',
    'Try running "lando setup" to restart it,',
    'or check ~/.lando/logs/buildkitd.log for errors.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
