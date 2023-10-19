'use strict';

const _ = require('lodash');

module.exports = data => _.toLower(data).replace(/_|-|\.+/g, '');
