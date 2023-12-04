'use strict';

const fs = require('fs');
const get = require('lodash/get');
const path = require('path');

// @TODO: maybe extension should be in {options}?
module.exports = (file, data, options = {}) => {
  // @TODO: error handling, defaults etc?

  // set extension if not set
  const extension = options.extension || path.extname(file);

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
          return fs.writeFileSync(file, require('js-yaml').dump(data, options));
        } catch (error) {
          throw new Error(error);
        }
      }
    case '.json':
    case 'json':
      require('jsonfile').writeFileSync(file, data, options);
    default:
  }
};
