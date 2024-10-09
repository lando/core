'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (!_.has(app.meta, 'builtAgainst')) require('./app-update-built-against')(app, lando);
  if (app.meta.builtAgainst !== app._config.version) app.addMessage(require('../messages/rebuild-tip'));
};
