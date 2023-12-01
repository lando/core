'use strict';

const dropRight = require('lodash/dropRight');
const path = require('path');
const range = require('lodash/range');

/*
 * TBD
 */
module.exports = (files, startsFrom) => {
  return range(startsFrom.split(path.sep).length)
  .map(end => dropRight(startsFrom.split(path.sep), end).join(path.sep))
  .map(dir => files.map(file => path.join(dir, path.basename(file))))
  .flat(Number.POSITIVE_INFINITY);
};
