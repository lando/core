'use strict';

const fs = require('fs');
const path = require('path');

module.exports = (file, options = {}) => {
  // @TODO: file does nto exist?

  // set extension if not set
  const extension = options.extension || path.extname(file);

  // @TODO: better try/catches here?
  // @TODO: throw error for default?
  switch (extension) {
    case '.yaml':
    case '.yml':
    case 'yaml':
    case 'yml':
      return require('../components/yaml').load(fs.readFileSync(file, 'utf8'), options);
    case '.js':
    case 'js':
      return require(file);
    case '.json':
    case 'json':
      return require('jsonfile').readFileSync(file, options);
    default:
      return fs.readFileSync(file, 'utf8');
  }
};
