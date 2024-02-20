'use strict';

const semver = require('semver');

module.exports = (raw, {
  includePrerelease = false,
  loose = false,
  satisfies = 'x.x.x',
} = {}) => {
  // get a cleaned version string and any prerelease data
  const {version, prerelease} = semver.parse(semver.clean(raw), {includePrerelease, loose});

  // figure out whether we should drop the prerelease string or nto
  const cversion = prerelease.every(item => Number.isInteger(item)) ? version.split('-')[0] : version;

  // otherwise return the normal compare
  return semver.satisfies(cversion, satisfies, {includePrerelease, loose});
};
