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

// adds required methods to ensure the lando v3 debugger can be injected into v4 things
module.exports = services => _(services)
  .map((service, name) => _.merge({}, {
    name,
    api: getApiVersion(service.api),
    config: _.omit(service, ['api', 'meUser', 'moreHttpPorts', 'primary', 'scanner', 'sport', 'type']),
    legacy: {
      meUser: service.meUser || 'www-data',
      moreHttpPorts: service.moreHttpPorts || [],
      sport: service.sport || '443',
    },
    primary: service.primary || false,
    scanner: service.scanner || false,
    type: service.type || 'l337',
  }))
  .value();
