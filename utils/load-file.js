'use strict';

const exists = require('./exists-sync');

module.exports = file => {
  // if the file doesnt exist then return an empty object
  if (!exists(file)) return {};
  // otherwise load the file and return it
  return require('./read-file')(file);
};

