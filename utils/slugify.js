'use strict';

module.exports = data => require('slugify')(data, {lower: true, strict: true});
