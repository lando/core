'use strict';

const _ = require('lodash');

module.exports = (name, info = []) => {
  // if no matching service return www-data
  if (!_.find(info, {service: name})) return 'www-data';
  // otherwise get the service
  const service = _.find(info, {service: name});
  // if this is a "no-api" service eg type "docker-compose" return meUser or www-data as default
  if (!service.api && service.type === 'docker-compose') return service.meUser || 'www-data';
  // otherwise return different things based on the api
  return service.api === 4 ? service.user || 'www-data' : service.meUser || 'www-data';
};
