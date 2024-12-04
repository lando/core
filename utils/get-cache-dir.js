'use strict';

const os = require('os');
const path = require('path');

const getOClifHome = () => {
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      return process.env.HOME || os.homedir() || os.tmpdir();
    case 'win32':
      return process.env.HOME
        || (process.env.HOMEDRIVE && process.env.HOMEPATH && path.join(process.env.HOMEDRIVE, process.env.HOMEPATH))
        || process.env.USERPROFILE
        || os.homedir()
        || os.tmpdir();
  }
};

/*
 * Get oclif base dir based on platform
 */
const getOClifBase= product => {
  const base = process.env['XDG_CACHE_HOME']
    || (process.platform === 'win32' && process.env.LOCALAPPDATA)
    || path.join(getOClifHome(), '.cache');
  return path.join(base, product);
};

const macosCacheDir = product => {
  return process.platform === 'darwin' ? path.join(getOClifHome(), 'Library', 'Caches', product) : undefined;
};

module.exports = (product = 'hyperdrive') => {
  return process.env[`${product.toUpperCase()}_CACHE_DIR`]
    || macosCacheDir(product)
    || getOClifBase(product);
};
