'use strict';

const _ = require('lodash');

// checks to see if a setting is disabled
module.exports = (deps, pkger, prefix = []) => _(deps)
  .map((version, pkg) => _.flatten([prefix, pkger(pkg, version)]))
  .map(command => command.join(' '))
  .value();
