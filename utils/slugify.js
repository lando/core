'use strict';

const _ = require('lodash');

module.exports = data => require('slugify')(_.toString(data), {lower: true, strict: true});
