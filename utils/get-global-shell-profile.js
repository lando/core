'use strict';

const path = require('path');

module.exports = () => {
  const shellPath = process.env.SHELL;
  if (!shellPath) {
    console.error('SHELL environment variable is not set.');
    return null;
  }

  // Extract the shell name from the SHELL environment variable
  const shellName = path.basename(shellPath);

  // Map common shell names to their profile file names
  const shellRcMap = {
    'bash': '/etc/bash.bashrc',
    'zsh': ['/etc/zsh/zshrc', '/etc/zshrc'],
    'fish': '/etc/fish/config.fish',
    'csh': '/etc/csh.cshrc',
  };

  const rcFileName = shellRcMap[shellName];
  if (!rcFileName) {
    console.error(`Unsupported or unknown shell: ${shellName}`);
    return null;
  }

  return rcFileName;
};
