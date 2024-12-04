'use strict';

const merge = require('lodash/merge');

// @TODO: error handling
module.exports = (a, b, ams = 'replace') => {
  // get strat and id if applicable
  const strategy = ams.split(':')[0];
  const by = ams.split(':')[1] || 'id';

  switch (strategy) {
    case 'aoa':
      return (a.length === 1) ? [a, b] : [...a, b];
    case 'concat':
      return a.concat(b);
    case 'first':
      return a;
    case 'last':
      return b;
    case 'merge':
      return Object.entries([a, b]
        .filter(Boolean)
        .reduce((acc, datum) => {
          return merge(acc, Object.fromEntries(datum.map(a => {
            // if an object do fancy stuff
            if (require('lodash/isPlainObject')(a)) {
              if (Object.prototype.hasOwnProperty.call(a, by)) return [a[by], a];
              if (Object.keys(a).length === 1) return [Object.keys(a)[0], a];
            }
            // otherwise just return pairself
            return [a, a];
        })));
        }, {}))
        .map(data => data[1]);
    case 'replace':
    default:
      return merge(a, b);
  }
};
