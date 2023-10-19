'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = (files, base = process.cwd()) => {
  _.forEach(files, file => {
    fs.chmodSync(path.join(base, file), '755');
  });
};
