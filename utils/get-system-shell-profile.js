'use strict';

module.exports = (shell = require('./get-user-shell')()) => {
  if (!shell) {
    console.error('Could not detect shell!');
    return null;
  }

  switch (shell) {
    case 'bash':
    case 'bash.exe':
      return '/etc/bash.bashrc';
    case 'cmd.exe':
      return 'system';
    case 'csh':
    case 'csh.exe':
      return '/etc/csh.cshrc';
    case 'fish':
    case 'fish.exe':
      return '/etc/fish/config.fish';
    case 'powershell.exe':
    case 'pswh':
      return require('./get-pwsh-profile')();
    case 'zsh':
    case 'zsh.exe':
      return ['/etc/zsh/zshrc', '/etc/zshrc'];
    default:
      return '/etc/profile';
  }
};
