'use strict';

module.exports = path => {
  const {stdout} = require('./spawn-sync-stringer')('wslpath', ['-u', path], {encoding: 'utf-8'});
  return stdout.trim();
};
