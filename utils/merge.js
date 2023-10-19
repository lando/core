'use strict';

const _ = require('lodash');

module.exports = (old, ...fresh) => _.mergeWith(old, ...fresh, (s, f) => {
  if (_.isArray(s)) return _.uniq(s.concat(f));
});
