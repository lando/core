'use strict';

const path = require('node:path');
const AutoLoad = require('@fastify/autoload');

// Pass --options via CLI arguments in command to enable these options.
const options = {};

module.exports = async function(fastify, opts) {
  // Place here your custom code!

  // Do not touch the following lines
  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts),
  });
};

module.exports.options = options;
