'use strict';

const fs = require('fs');
const get = require('lodash/get');
const path = require('path');
const remove = require('./remove');

// @TODO: maybe extension should be in {options}?
module.exports = (file, data, options = {}) => {
  // @TODO: error handling, defaults etc?

  // set extension if not set
  const extension = options.extension || path.extname(file);
  // linux line endings
  const forcePosixLineEndings = options.forcePosixLineEndings ?? false;
  // set overwrite if not set
  const overwrite = options.overwrite ?? true;

  // data is a string and posixOnly then replace
  if (typeof data === 'string' && forcePosixLineEndings) data = data.replace(/\r\n/g, '\n');
  // if overwrite is on make sure we purge first
  if (overwrite) remove(file);

  switch (extension) {
    case '.yaml':
    case '.yml':
    case 'yaml':
    case 'yml':
      // if this is a YAML DOC then use yaml module
      if (get(data, 'constructor.name') === 'Document') {
        try {
          fs.writeFileSync(file, data.toString());
        } catch (error) {
          throw new Error(error);
        }

      // otherwise use the normal js-yaml dump
      } else {
        try {
          fs.writeFileSync(file, require('../components/yaml').dump(data, options));
        } catch (error) {
          throw new Error(error);
        }
      }
      break;
    case '.json':
    case 'json':
      require('jsonfile').writeFileSync(file, data, options);
      break;
    default:
      if (!fs.existsSync(file)) fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, data, {encoding: 'utf-8'});
  }
};
