'use strict';

module.exports = data => typeof data === 'string' || data?.constructor?.name == 'ImportString';
