'use strict';

const fs = require('fs');

// standardize remove func
module.exports = path => fs.rmSync(path, {force: true, retryDelay: 201, maxRetries: 16, recursive: true});
