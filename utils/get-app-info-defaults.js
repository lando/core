'use strict';

const _ = require('lodash');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = app => _(app.services)
  .map(service => _.merge(
    {service, urls: [], type: 'docker-compose', healthy: 'unknown'},
    _.omitBy(
      {
        meUser: _.get(app.config.services, service)?.meUser,
        appMount: _.get(app.config.services, service)?.appMount,
        hasCerts: _.get(app.config.services, service)?.ssl,
      },
      _.isNil,
    ),
  ))
  .map(service => _.merge({}, service, _.find(app.info, {service: service.service})))
  .value();
