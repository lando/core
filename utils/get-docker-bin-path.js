'use strict';

const fs = require('fs');
const path = require('path');

module.exports = (platform = process.landoPlatform ?? process.platform) => {
  switch (platform) {
    case 'linux':
    case 'wsl':
      return '/usr/share/lando/bin';
    case 'win32': {
      const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles;
      const programData = process.env.ProgramData;
      // Check for Docker in 2.3.0.5+ first
      if (fs.existsSync(path.win32.join(programData + '\\DockerDesktop\\version-bin\\docker.exe'))) {
        return path.win32.join(programData + '\\DockerDesktop\\version-bin');
      // Otherwise use the legacy path
      } else {
        return path.win32.join(programFiles + '\\Docker\\Docker\\resources\\bin');
      }
    }
    default:
      return '/usr/bin';
  }
};
