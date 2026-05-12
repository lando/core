'use strict';

const fs = require('fs');
const merge = require('lodash/merge');
const read = require('./read-file');

module.exports = (file, config = {}, systemFile = null) => {
  let base = {};
  if (systemFile && fs.existsSync(systemFile)) {
    try {
      base = read(systemFile);
    } catch {
      // system file unreadable (e.g. wrong permissions) — skip silently
    }
  }
  if (fs.existsSync(file)) return merge({}, base, read(file), config);
  return merge({}, base, config);
};
