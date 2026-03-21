'use strict';

module.exports = () => ({
  title: 'containerd socket conflict detected',
  type: 'warning',
  detail: [
    'Another containerd instance may be using the socket.',
    'Lando uses its own isolated containerd instance at',
    '/run/lando/containerd.sock to avoid conflicts.',
    'If problems persist, stop any other containerd instances',
    'or check for stale socket files.',
  ],
  url: 'https://docs.lando.dev/config/engine.html',
});
