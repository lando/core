'use strict';

const os = require('os');
const path = require('path');

module.exports = (shell = require('./get-user-shell')()) => {
  if (!shell) {
    console.error('Could not detect shell!');
    return null;
  }

  // powershell is annoying
  if (shell === 'powershell.exe') {
    const version = require('./get-psmv')();
    shell = `powershell${version}.exe`;
  }

  // Map common shell names to their profile file names
  const shellRcMap = {
    'bash': '.bashrc',
    'bash.exe': '.bashrc',
    'cmd.exe': 'user',
    'csh': '.cshrc',
    'fish': '.config/fish/config.fish',
    'ksh': '.kshrc',
    'tcsh': '.tcshrc',
    'powershell.exe': 'Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1',
    'powershell5.exe': 'Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1',
    'powershell6.exe': 'Documents/PowerShell/Microsoft.PowerShell_profile.ps1',
    'powershell7.exe': 'Documents/PowerShell/Microsoft.PowerShell_profile.ps1',
    'zsh': '.zshrc',
  };

  const rcFileName = shellRcMap[shell];
  if (!rcFileName) {
    console.error(`Unsupported or unknown shell: ${shell}`);
    return null;
  }

  return path.join(os.homedir(), rcFileName);
};
