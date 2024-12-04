'use strict';

const _ = require('lodash');

module.exports = async app => {
  // get local services
  const locals = _.get(app, 'opts.local', []);
  // get v4 services
  const v4s = _.get(app, 'v4.servicesList', []);
  // reset opts.local to only be v3 services
  app.opts.local = _.difference(locals, v4s);
};
