'use strict';

module.exports = () => ({
  title: 'finch-daemon is not running',
  type: 'warning',
  detail: [
    'The finch-daemon (Docker API compatibility layer) is not running.',
    'finch-daemon provides a Docker-compatible socket for tools like Traefik.',
    'Try running "lando setup" or restarting Lando.',
    'Check ~/.lando/logs/finch-daemon.log for errors.',
  ],
  url: 'https://docs.lando.dev/troubleshooting/containerd.html#finch-daemon-is-not-running',
});
