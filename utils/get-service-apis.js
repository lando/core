'use strict';

const _ = require('lodash');

module.exports = (services = []) => _(services)
  .map(service => {
    if (service.api === 4 && service.type === 'l337') return [service.name, 'l337'];
    return [service.name, service.api];
  })
  .fromPairs()
  .value();
