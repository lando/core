'use strict';

const fs = require('fs');

/**
 * Permissive fs.existsSync().
 *
 * Node >=24 emits a DEP0187 deprecation warning when fs.existsSync() is handed anything that is
 * not a string, Buffer or URL. Lando has a bunch of call sites that are legitimately permissive
 * eg they pluck optional keys off of plugin/config objects and just want a "is there a file
 * there?" answer. This restores the pre-24 behavior of quietly returning false for those.
 *
 * @param {*} file - The thing to check, may be anything
 * @return {boolean} Whether file is a path that exists
 */
module.exports = file => {
  // bail on anything fs.existsSync() would warn about
  if (typeof file !== 'string' && !Buffer.isBuffer(file) && !(file instanceof URL)) return false;
  // otherwise defer to node
  return fs.existsSync(file);
};
