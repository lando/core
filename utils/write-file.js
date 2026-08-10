'use strict';

const fs = require('fs');
const get = require('lodash/get');
const path = require('path');

// @TODO: maybe extension should be in {options}?
// @TODO: error handling, defaults etc?
/**
 * Write data to a file, serializing based on the file extension.
 *
 * @param {string} file - Destination file path.
 * @param {*} data - Data to write.
 * @param {object} [options] - Write options, also passed to the relevant serializer.
 * @param {string} [options.extension] - Extension override for serialization format.
 * @param {boolean} [options.forcePosixLineEndings=false] - Normalize CRLF to LF.
 * @return {void}
 */
module.exports = (file, data, options = {}) => {
  // set extension if not set
  const extension = options.extension || path.extname(file);
  // if the target path exists as a directory then remove it so we can write a file there instead
  // this can happen when eg docker compose creates a missing bind mount source as a directory
  // https://github.com/lando/core/issues/486
  // @NOTE: we intentionally do not remove existing files here so bind mounted files keep their
  // inode across rewrites, see https://github.com/lando/core/issues/242
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) require('./remove')(file);
  // linux line endings
  const forcePosixLineEndings = options.forcePosixLineEndings ?? false;

  // special handling for ImportString
  if (typeof data !== 'string' && data?.constructor?.name === 'ImportString') data = data.toString();

  // data is a string and posixOnly then replace
  if (typeof data === 'string' && forcePosixLineEndings) data = data.replace(/\r\n/g, '\n');

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
      require('jsonfile').writeFileSync(file, data, {spaces: 2, ...options});
      break;
    default:
      if (!fs.existsSync(file)) fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, data, {encoding: 'utf-8'});
  }
};
