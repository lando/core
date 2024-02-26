'use strict';

const path = require('path');
const fs = require('fs');

module.exports = file => {
  const dirstring = process?.env?.PATH ?? [];
  const dirs = dirstring.split(path.delimiter);
  return fs.lstatSync(file).isDirectory() ? dirs.includes(file) : dirs.includes(path.dirname(file));
};
