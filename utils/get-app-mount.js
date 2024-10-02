'use strict';

const _ = require('lodash');

module.exports = (name, info = []) => {
  // if no matching service return /app
  if (!_.find(info, {service: name})) return '/app';
  // otherwise get the service
  const service = _.find(info, {service: name});
  return service.appMount || '/app';
};
