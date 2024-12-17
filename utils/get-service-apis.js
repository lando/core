'use strict';

const _ = require('lodash');

module.exports = app => {
  const v4 = _.get(app, 'v4.services', []);
  const v3 = _.get(app, 'parsedV3Services', []);

  return _([...v3, ...v4])
    .map(service => {
      if (service.api === 4 && service.type === 'l337') return [service.name, 'l337'];
      return [service.name, service.api];
    })
    .fromPairs()
    .value();
};
