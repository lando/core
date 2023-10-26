'use strict';

const isObject = require('lodash/isPlainObject');
const merge = require('lodash/mergeWith');
const mergeArrays = require('./merge-arrays');

// @TODO: error handling
module.exports = (object, sources, ams = ['merge:id', 'replace']) => {
  // if sources is not an array then make it so
  if (!Array.isArray(sources)) sources = [sources];

  // normalize ams into array
  ams = Array.isArray(ams) ? ams : [ams];
  // then break into the things we need
  const first = ams[0].split(':')[0];
  const by = ams[0].split(':')[1] || 'id';
  const fallback = ams[1] || 'replace';

  // then return the merge
  return merge(object, ...sources, (objValue, srcValue) => {
    // if not an arrayjust proceed normally
    if (!Array.isArray(objValue)) return undefined;
    // if first strategy is replace then also proceed normally
    if (first === 'replace') return undefined;
    // if first strategy is merge and some part of objvalue has an object then try to merge with by
    if (first === 'merge') {
      // if mergable object detected in array then proceed
      if (objValue.some(element => isObject(element))) return mergeArrays(objValue, srcValue, `merge:${by}`);
      // otherwise return the fallback
      return mergeArrays(objValue, srcValue, fallback);
    }
    // if we get here then just pass it through to mergeArrays
    return mergeArrays(objValue, srcValue, first);
  });
};
