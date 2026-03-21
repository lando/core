'use strict';

const os = require('os');
const path = require('path');

module.exports = (config = {}) => {
  const userConfRoot = config.userConfRoot || path.join(os.homedir(), '.lando');
  const socketDir = config.containerdSocketDir || '/run/lando';

  return {
    userConfRoot,
    configDir: path.join(userConfRoot, 'config'),
    runDir: path.join(userConfRoot, 'run'),
    socketDir,
    containerdSocket: config.containerdSocket || path.join(socketDir, 'containerd.sock'),
    buildkitSocket: config.buildkitSocket || path.join(socketDir, 'buildkitd.sock'),
    finchSocket: config.finchDaemonSocket || config.finchSocket || path.join(socketDir, 'finch.sock'),
    finchCredentialSocket: config.finchCredentialSocket || path.join(socketDir, 'finch-credential.sock'),
  };
};
