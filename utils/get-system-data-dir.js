'use strict';

const path = require('path');

module.exports = (id = 'lando') => {
  switch (process.platform) {
    case 'darwin':
      return path.join('/', 'Library', 'Application Support', `${id[0].toUpperCase()}${id.slice(1).toLowerCase()}`);
    case 'linux':
      return path.join('/', 'srv', `${id.toLowerCase()}`);
    case 'win32':
      return path.join(
        process.env.PROGRAMDATA || process.env.ProgramData, `${id[0].toUpperCase()}${id.slice(1).toLowerCase()}`,
      );
  }
};
