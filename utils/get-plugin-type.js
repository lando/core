'use strict';

module.exports = plugin => require('is-root')() ? 'system' : 'user';
