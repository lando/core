'use strict';

const path = require('path');

module.exports = () => {
  switch (process.platform) {
    case 'darwin':
      return '/Applications/Docker.app/Contents/Resources/bin';
    case 'linux':
      return require('./get-docker-bin-path')();
    case 'win32': {
      const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles;
      return path.win32.join(programFiles + '\\Docker\\Docker\\resources\\bin');
    }
  }
};
