'use strict';

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');

/**
 * Locate the containerd binary.
 *
 * Resolution order:
 * 1. Config override (config.containerdBin)
 * 2. ~/.lando/bin/containerd
 * 3. PATH lookup (which containerd)
 * 4. false (not found)
 *
 * Follows the same pattern as get-docker-x.js.
 *
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.containerdBin] - Explicit binary path override.
 * @param {string} [opts.userConfRoot] - Lando config root (default ~/.lando).
 * @returns {string|false} Absolute path to the containerd binary, or false.
 */
module.exports = ({containerdBin, userConfRoot = path.join(os.homedir(), '.lando')} = {}) => {
  const bin = 'containerd';
  const join = (process.platform === 'win32') ? path.win32.join : path.posix.join;

  // 1. Config override
  if (containerdBin && fs.existsSync(containerdBin)) {
    return path.normalize(containerdBin);
  }

  // 2. ~/.lando/bin/containerd
  const landoBin = join(userConfRoot, 'bin', bin);
  if (fs.existsSync(landoBin) && !fs.statSync(landoBin).isDirectory()) {
    return path.normalize(landoBin);
  }

  // 3. PATH lookup
  if (process.platform !== 'win32') {
    const whichBin = _.toString(shell.which(bin));
    if (whichBin && fs.existsSync(whichBin)) {
      return path.normalize(whichBin);
    }
  }

  // 4. Not found
  return false;
};
