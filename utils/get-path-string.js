'use strict';

module.exports = (paths = [], shell = require('./get-user-shell')()) => {
  // return NADA if no paths
  if (paths.length === 0) return '';

  // otherwise switchit
  switch (shell) {
    case 'powershell.exe':
    case 'cmd.exe':
      return paths.join(';');

    default:
      return paths.join(':');
  }
};
