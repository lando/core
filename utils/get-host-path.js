'use strict';

const _ = require('lodash');

module.exports = mount => _.dropRight(mount.split(':')).join(':');
