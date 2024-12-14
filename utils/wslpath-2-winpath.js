'use strict';

module.exports = path => {
  const {stdout} = require('./spawn-sync-stringer')('wslpath', ['-w', path], {encoding: 'utf-8'});
  return stdout.trim();
};
