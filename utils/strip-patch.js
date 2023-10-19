'use strict';

const _ = require('lodash');

module.exports = version => _.slice(version.split('.'), 0, 2).join('.');
