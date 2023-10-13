'use strict';

const _ = require('lodash');

module.exports = async (app, lando) => {
  if (!_.has(app.meta, 'builtAgainst')) {
    return lando.engine.list({project: app.project, all: true}).then(containers => {
      if (!_.isEmpty(containers)) require('./app-update-built-against')(app, lando);
    });
  }
};
