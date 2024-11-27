'use strict';

module.exports = async (path, {
  debug = require('debug')('@lando/wslpath-2-winpath'),
} = {}) => {
  const {stdout} = await require('./run-command')('wslpath', ['-w', path], {debug});
  return stdout.trim();
};
