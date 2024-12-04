'use strict';

module.exports = () => require('is-root')() ? 'system' : 'user';
