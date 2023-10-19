'use strict';

const _ = require('lodash');
const path = require('path');

module.exports = (local, base = '.', excludes = []) => {
  // Return local if it starts with $ or ~
  if (_.startsWith(local, '$') || _.startsWith(local, '~')) return local;
  // Return local if it is one of the excludes
  if (_.includes(excludes, local)) return local;
  // Return local if local is an absolute path
  if (path.isAbsolute(local)) return local;
  // Otherwise this is a relaive path so return local resolved by base
  return path.resolve(path.join(base, local));
};
