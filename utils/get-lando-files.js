'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

/*
 * Helper to traverse up directories from a start point
 */
const traverseUp = file => _(_.range(path.dirname(file).split(path.sep).length))
  .map(end => _.dropRight(path.dirname(file).split(path.sep), end).join(path.sep))
  .map(dir => path.join(dir, path.basename(file)))
  .value();

module.exports = (files = [], startFrom = process.cwd()) => _(files)
  .flatMap(file => traverseUp(path.resolve(startFrom, file)))
  .sortBy().reverse()
  .filter(file => fs.existsSync(file) && path.isAbsolute(file))
  .thru(files => _.isEmpty(files) ? [] : [_.first(files)])
  .flatMap(dirFile => _.map(files, file => path.join(path.dirname(dirFile), file)))
  .filter(file => fs.existsSync(file))
  .value();
