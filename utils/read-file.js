'use strict';

const fs = require('fs');
const path = require('path');

module.exports = (file, options = {}) => {
  // @TODO: file does nto exist?

  // set extension if not set
  const extension = options.extension || path.extname(file);

  // @TODO: better try/catches here?
  // @TODO: throw error for default?
  // @TODO: require('js-yaml').loadAll?
  switch (extension) {
    case '.yaml':
    case '.yml':
    case 'yaml':
    case 'yml':
      try {
        return require('js-yaml').load(fs.readFileSync(file, 'utf8'), options);
      } catch (e) {
        throw e;
      }
    case '.js':
    case 'js':
      return require(file);
    case '.json':
    case 'json':
      return require('jsonfile').readFileSync(file, options);
    default:
      // throw error
  }
};
