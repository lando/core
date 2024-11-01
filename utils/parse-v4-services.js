'use strict';

// Modules
const _ = require('lodash');

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = services => _(services)
  .pickBy(service => null !== service)
  .map((service, name) => {
    const type = service.type ?? 'lando';
    return _.merge({}, {
      name,
      api: require('./get-service-api-version')(service.api),
      builder: type.split(':')[0],
      config: _.omit(service, ['api', 'meUser', 'moreHttpPorts', 'primary', 'scanner', 'sport', 'type']),
      primary: service.primary ?? false,
      router: type.split(':')[1],
      scanner: service.scanner ?? false,
      type: type,
    });
  })
  .value();
