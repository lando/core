'use strict';

const _ = require('lodash');

module.exports = composeData => _(composeData)
  .flatMap(data => data.data)
  .flatMap(data => _.keys(data.services))
  .uniq()
  .value();
