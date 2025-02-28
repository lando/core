'use strict';

const _ = require('lodash');
const copydir = require('copy-dir');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const remove = require('./remove');

module.exports = (src, dest = os.tmpdir()) => {
  // Copy opts and filter out all js files
  // We don't want to give the false impression that you can edit the JS
  const filter = (stat, filepath, filename) => (path.extname(filename) !== '.js');
  // Ensure to exists
  fs.mkdirSync(dest, {recursive: true});
  // Try to copy the assets over
  try {
    // @todo: why doesn't the below work for PLD?
    copydir.sync(src, dest, filter);
    require('./make-executable')(_(fs.readdirSync(dest))
      .filter(file => path.extname(file) === '.sh')
      .value()
    , dest);
  } catch (error) {
    const code = _.get(error, 'code');
    const syscall = _.get(error, 'syscall');
    const f = _.get(error, 'path');

    // Catch this so we can try to repair
    if (code !== 'EISDIR' || syscall !== 'open' || !!fs.mkdirSync(f, {recursive: true})) {
      remove(f);
      throw new Error(error);
    }

    // Try to take corrective action
    remove(f);
    copydir.sync(src, dest, filter);
    require('./make-executable')(_(fs.readdirSync(dest))
      .filter(file => path.extname(file) === '.sh')
      .value()
    , dest);
  }

  // Return the new scripts directory
  return dest;
};
