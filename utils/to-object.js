'use strict';

const _ = require('lodash');

// checks to see if a setting is disabled
module.exports = (keys, data = {}) => _(keys)
  .map(service => data)
  .map((service, index) => _.set({}, keys[index], service))
  .thru(services => _.reduce(services, (sum, service) => _.merge(sum, service), {}))
  .value();
