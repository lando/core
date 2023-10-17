'use strict';

const _ = require('lodash');
const os = require('os');

module.exports = () => (process.platform === 'win32') ? '1000' : _.toString(os.userInfo().uid);
