'use strict';

const _ = require('lodash');

module.exports = async app => {
  const info = require('../utils/to-object')(_.map(app.info, 'service'), {});
  _.forEach(info, (value, key) => {
    info[key] = _.find(app.info, {service: key});
  });
  app.log.verbose('setting LANDO_INFO...');
  app.env.LANDO_INFO = JSON.stringify(info);
};
