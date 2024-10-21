'use strict';

module.exports = prefix => {
  return Object.fromEntries(Object.keys(process.env)
    // filter out keys that dont make sense
    .filter(key => key.startsWith(`${prefix}_`))
    // map to key/pair values
    .map(key => ([
      require('lodash/camelCase')(key.replace(`${prefix}_`, '')),
      require('./try-convert-json')(process.env[key]),
    ])));
};
