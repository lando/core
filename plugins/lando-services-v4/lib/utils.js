'use strict';

// Modules
const _ = require('lodash');

const getApiVersion = (version = 3) => {
  // return 4 if its 4ish
  if (version === 4 || version === '4' || version === 'v4') return 4;
  // return 3 if its 3ish
  else if (version === 3 || version === '3' || version === 'v3') return 3;
  // if we have no idea then also return 3
  return 3;
};

/*
 * Parse config into raw materials for our factory
 */
exports.parseConfig = services => _(services)
  // Arrayify
  .map((service, name) => _.merge({}, {
    name,
    api: getApiVersion(service.api),
    config: _.omit(service, ['api', 'type']),
  }))
  // ensure api is set to something valid
  .map(service => _.merge({}, service, {api: getApiVersion(service.api)}))
  // set v4 base type if applicable
  .map(service => _.merge({}, {type: service.api === 4 ? '_compose' : undefined}, service))
  // Filter out any services without a type, this implicitly assumes these
  // services are "managed" by lando eg their type/version details are provided
  // by another service
  .filter(service => !_.isNil(service.type))
  .value();
