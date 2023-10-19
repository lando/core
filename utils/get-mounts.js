'use strict';

const _ = require('lodash');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = (services = {}) => _(services)
  .map((service, id) => _.merge({}, {id}, service))
  .map(service => ([service.id, service.appMount]))
  .fromPairs()
  .value();
