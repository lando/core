'use strict';

const fs = require('fs');

module.exports = file => {
  // if the file doesnt exist then return an empty object
  if (!fs.existsSync(file)) return {};
  // otherwise load the file and return it
  return require('./read-file')(file);
};

