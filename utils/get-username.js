'use strict';

const os = require('os');

module.exports = () => os.userInfo().username;
