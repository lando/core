'use strict';

const semver = require('semver');

module.exports = version => {
  // throw error if not a valid version
  if (semver.valid(semver.clean(version)) === null) {
    throw new Error(`${version} must be a semantic version for this to work!`);
  }

  // parse the version
  version = semver.parse(version);

  // if prerelease is empty then this is stable version
  if (version.prerelease.length === 0) return false;

  // if prerelease is length 2 with string and integer parts then this is a non-dev prerelease
  if (version.prerelease.length === 2 && typeof version.prerelease[0] === 'string' && Number.isInteger(version.prerelease[1])) {
    return false;
  }

  // if we get here then lets just assume its a dev release?
  return true;
};
