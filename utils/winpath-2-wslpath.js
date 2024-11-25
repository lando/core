'use strict';

module.exports = async (path, {
  debug = require('debug')('@lando/winpath-2-wslpath'),
} = {}) => {
  const {stdout} = await require('./run-command')('wslpath', ['-u', path], {debug});
  return stdout.trim();
};
