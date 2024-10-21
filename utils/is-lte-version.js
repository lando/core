'use strict';

const semver = require('semver');
const isDevVersion = require('./is-dev-version');

module.exports = (a, b) => {
  // parse the versions
  a = semver.parse(a);
  b = semver.parse(b);

  // if neither version is a dev version then just do the normal
  if (!isDevVersion(a.version) && !isDevVersion(b.version)) return semver.lte(a.version, b.version);
  // if major minor patch are different then also do the normal
  if (a.major !== b.major || a.minor !== b.minor || a.patch !== b.patch) return semver.lte(a.version, b.version);
  // if only one is a dev version then lte
  if (!isDevVersion(b.version) || !isDevVersion(a.version)) return isDevVersion(b.version) > isDevVersion(a.version);

  // if we get here then both are dev versions so lets just calc which is ahead
  const aahead = a.prerelease[0].split('-')[0];
  const bahead = b.prerelease[0].split('-')[0];
  return bahead >= aahead;
};
