'use strict';

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');

const getDockerBin = (bin, base, pathFallback = true) => {
  // Do platform appropriate things to get started
  const join = (process.platform === 'win32') ? path.win32.join : path.posix.join;
  let binPath = (process.platform === 'win32') ? join(base, `${bin}.exe`) : join(base, bin);

  // Use PATH compose executable on posix if ours does not exist
  if (pathFallback && process.platform !== 'win32' && (!fs.existsSync(binPath) || fs.statSync(binPath).isDirectory())) {
    binPath = _.toString(shell.which(bin));
  }

  // If the binpath still does not exist then we should set to false and handle downstream
  if (!fs.existsSync(binPath)) return false;

  // Otherwise return a normalized binpath
  switch (process.platform) {
    case 'darwin': return path.posix.normalize(binPath);
    case 'linux': return path.posix.normalize(binPath);
    case 'win32': return path.win32.normalize(binPath);
  }
};

module.exports = ({orchestratorVersion = '2.31.0', userConfRoot = os.tmpdir()} = {}) => {
  const orchestratorBin = `docker-compose-v${orchestratorVersion}`;
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      // use lando bin if available
      if (fs.existsSync(path.join(userConfRoot, 'bin', orchestratorBin))) {
        return getDockerBin(orchestratorBin, path.join(userConfRoot, 'bin'), false);
      }
      // otherwise use docker desktop one if available
      return getDockerBin('docker-compose', require('./get-compose-bin-path')(), process.platform === 'linux');
    case 'win32':
      // use lando bin if available
      if (fs.existsSync(path.join(userConfRoot, 'bin', `${orchestratorBin}.exe`))) {
        return getDockerBin(orchestratorBin, path.join(userConfRoot, 'bin'), false);
      }
      // otherwise use docker desktop one if available
      return getDockerBin('docker-compose', require('./get-compose-bin-path')());
  }
};
