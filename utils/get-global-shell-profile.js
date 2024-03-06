'use strict';

module.exports = (shell = require('./get-user-shell')()) => {
  if (!shell) {
    console.error('Could not detect shell!');
    return null;
  }

  // powershell is annoying
  if (shell === 'powershell.exe') {
    const version = require('./get-psmv')();
    if (version <= 5) {
      return `${process.env.SystemRoot ?? process.env.windir}/WindowsPowerShell/v1.0/profile.ps1`;
    } else {
      return `${process.env.ProgramFiles}/PowerShell/${version}/profile.ps1`;
    }
  }

  // Other shellz
  const shellRcMap = {
    'csh': '/etc/csh.cshrc',
    'cmd.exe': 'global',
    'bash': '/etc/bash.bashrc',
    'bash.exe': '/etc/bash.bashrc',
    'fish': '/etc/fish/config.fish',
    'zsh': ['/etc/zsh/zshrc', '/etc/zshrc'],
  };

  const rcFileName = shellRcMap[shell];
  if (!rcFileName) {
    console.error(`Unsupported or unknown shell: ${shell}`);
    return null;
  }

  return rcFileName;
};
