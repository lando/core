'use strict';

const fs = require('fs');
const os = require('os');

const WINBIN_REGEX = /\/mnt\/.\/WINDOWS\/System32$/i;

// Checks to see if Docker is installed via WSL/Windows interop.
module.exports = () => {
  // return anything that is not wsl as false
  if (!os.release().toLowerCase().includes('microsoft')) return false;

  // if we dont have have WSL_INTEROP then
  if (!process.env.WSL_INTEROP) return false;

  // attempt to find there the winbin is at
  const winbin = process.env.PATH.split(':').filter(path => WINBIN_REGEX.test(path));

  // if we cant find anything then false
  if (winbin.length === 0) return false;

  // otherwise return whether our first match exists
  return fs.existsSync(winbin[0]);
};
