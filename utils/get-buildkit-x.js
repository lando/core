'use strict';

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');

/**
 * Locate the buildkitd binary.
 *
 * Resolution order:
 * 1. Config override (config.buildkitdBin)
 * 2. ~/.lando/bin/buildkitd
 * 3. PATH lookup (which buildkitd)
 * 4. false (not found)
 *
 * Follows the same pattern as get-docker-x.js.
 *
 * @param {Object} [opts={}] - Options.
 * @param {string} [opts.buildkitdBin] - Explicit binary path override.
 * @param {string} [opts.userConfRoot] - Lando config root (default ~/.lando).
 * @returns {string|false} Absolute path to the buildkitd binary, or false.
 */
module.exports = ({buildkitdBin, userConfRoot = path.join(os.homedir(), '.lando')} = {}) => {
  const bin = 'buildkitd';
  const join = (process.platform === 'win32') ? path.win32.join : path.posix.join;

  // 1. Config override
  if (buildkitdBin && fs.existsSync(buildkitdBin)) {
    return path.normalize(buildkitdBin);
  }

  // 2. ~/.lando/bin/buildkitd
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
