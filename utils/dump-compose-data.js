'use strict';

const _ = require('lodash');
const path = require('path');
const Yaml = require('./../lib/yaml');
const yaml = new Yaml();

module.exports = (data, dir) => _(_.flatten([data]))
  .flatMap(group => _.map(group.data, (compose, index) => ({data: compose, file: `${group.id}-${index}.yml`})))
  .map(compose => yaml.dump(path.join(dir, compose.file), compose.data))
  .value();
