'use strict';

const path = require('path');

module.exports = (paths = []) => {
  if (paths.length > 0) {
    return [
      ['# Lando'],
      [`export PATH="${paths.join(path.delimiter)}\${PATH+${path.delimiter}$PATH}"; #landopath`, '#landopath'],
    ];
  }
  return [];
};
