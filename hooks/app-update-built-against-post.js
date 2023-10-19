'use strict';

const _ = require('lodash');
const warnings = require('../lib/warnings');

module.exports = async (app, lando) => {
  if (!_.has(app.meta, 'builtAgainst')) require('./app-update-built-against')(app, lando);
  if (app.meta.builtAgainst !== app._config.version) app.addWarning(warnings.rebuildWarning());
};
