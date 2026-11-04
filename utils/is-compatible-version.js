'use strict';

const semver = require('semver');

module.exports = (raw, {
  includePrerelease = false,
  loose = false,
  satisfies = 'x.x.x',
} = {}) => {
  // get a cleaned version string and any prerelease data
  // @NOTE: a missing or unparseable version (eg no Docker.app on macOS) is incompatible, not a crash
  const parsed = semver.parse(semver.clean(String(raw ?? '')), {includePrerelease, loose});
  if (parsed === null) return false;
  const {version, prerelease} = parsed;

  // figure out whether we should drop the prerelease string or nto
  const cversion = prerelease.every(item => Number.isInteger(item)) ? version.split('-')[0] : version;

  // otherwise return the normal compare
  return semver.satisfies(cversion, satisfies, {includePrerelease, loose});
};
