'use strict';

const _ = require('lodash');

module.exports = (keys, data = {}) => _(keys)
  .map(() => data)
  .map((service, index) => _.set({}, keys[index], service))
  .thru(services => _.reduce(services, (sum, service) => _.merge(sum, service), {}))
  .value();
