'use strict';

const _ = require('lodash');

module.exports = (more = {}) => _.merge({}, {
  PHP_MEMORY_LIMIT: '-1',
}, more);
