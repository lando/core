'use strict';

const _ = require('lodash');

module.exports = async app => {
  app.log.debug('adding hostnames to the app...');
  _.forEach(app.info, data => {
    data.hostnames = _.get(data, 'hostnames', []);
    data.hostnames.push([data.service, app.project, 'internal'].join('.'));
    data.hostnames = _.uniq(data.hostnames);
    app.log.debug('hostnames added to %s', data.service, data.hostnames);
  });
};
