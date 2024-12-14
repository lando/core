'use strict';

const getWinEnvar = require('../utils/get-win32-envvar-from-wsl');
const path = require('path');
const wslpath = require('./winpath-2-wslpath');

module.exports = (platform = process.landoPlatform ?? process.platform) => {
  switch (platform) {
    case 'darwin':
      return '/Applications/Docker.app';
    case 'win32': {
      const programFiles = process.env.ProgramW6432 ?? process.env.ProgramFiles;
      return path.win32.join(`${programFiles}\\Docker\\Docker\\Docker Desktop.exe`);
    }
    case 'wsl': {
      const programFiles = getWinEnvar('ProgramW6432') ?? getWinEnvar('ProgramFiles');
      const winpath = path.win32.join(`${programFiles}\\Docker\\Docker\\Docker Desktop.exe`);
      return wslpath(winpath);
    }
  }
};
