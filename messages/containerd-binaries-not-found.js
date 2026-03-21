'use strict';

module.exports = () => ({
  title: 'containerd backend binaries not found',
  type: 'error',
  detail: [
    'One or more required binaries for the containerd engine backend',
    'were not found at the expected path.',
    'The containerd backend requires containerd, buildkitd, finch-daemon,',
    'and docker-compose to be installed.',
    'Run "lando setup" to install them.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
