'use strict';

// Modules
const _ = require('lodash');

module.exports = lando => {
  // if there is no appserver and we have a primary service then use that
  // otherwise leave as appserver and handle it downstream the v3 way
  lando.events.on('cli-ssh-run', 1, data => {
    if (data.options.service === 'appserver') {
      const services = _.map(data.options._app.services, (service, name) => _.merge({}, service, {name}));
      const hasRecipe = _.has(data, 'options._app.recipe');

      if (!hasRecipe && !_.includes(services.map(service => service.name), 'appserver')) {
        const primaryService = _.find(services, service => service.primary);
        if (primaryService && primaryService.name) {
          data.options.service = primaryService.name;
          data.options.s = data.options.service;
        }
      }
    }
  });
};
