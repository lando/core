'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = (files = [], base = process.cwd()) => _(files)
  .map(file => (path.isAbsolute(file) ? file : path.join(base, file)))
  .filter(file => fs.existsSync(file))
  .value();
