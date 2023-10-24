'use strict';

module.exports = (old, ...fresh) => require('lodash/mergeWith')(old, ...fresh, (s, f) => {
  if (Array.isArray(s)) return require('lodash/uniq')(s.concat(f));
});
