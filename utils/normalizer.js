'use strict';

const _ = require('lodash');

module.exports = data => (!_.isArray(data)) ? [data] : data;
