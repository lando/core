'use strict';

const _ = require('lodash');

module.exports = (services = {}) => _(services)
  .map((service, id) => _.merge({}, {id}, service))
  .map(service => ([service.id, service.canExec ?? false]))
  .fromPairs()
  .value();
