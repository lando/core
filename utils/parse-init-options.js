'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = options => {
  // We set this here instad of as a default option because of our task caching
  if (!_.has(options, 'destination')) options.destination = process.cwd();
  // Generate a machine name for the app.
  options.name = require('./slugify')(options.name);
  // Get absolute path of destination
  options.destination = path.resolve(options.destination);
  // Create directory if needed
  if (!fs.existsSync(options.destination)) fs.mkdirSync(options.destination, {recursive: true});
  // Set node working directory to the destination
  // @NOTE: is this still needed?
  process.chdir(options.destination);
  return options;
};
