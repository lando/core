'use strict';

const _ = require('lodash');
const Yaml = require('./../lib/yaml');
const yaml = new Yaml();

module.exports = data => (files, dir) => _(require('./normalize-files')(files, dir))
  .map(file => yaml.load(file))
  .value();
