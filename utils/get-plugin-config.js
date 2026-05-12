'use strict';

const fs = require('fs');
const merge = require('lodash/merge');
const read = require('./read-file');

module.exports = (file, config = {}, systemFile = null) => {
  const base = systemFile && fs.existsSync(systemFile) ? read(systemFile) : {};
  if (fs.existsSync(file)) return merge({}, base, read(file), config);
  return merge({}, base, config);
};
