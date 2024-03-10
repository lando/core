'use strict';

const path = require('path');

module.exports = () => {
  // if no SHELL and on windows then attempt to discover
  if (!process.env.SHELL && process.platform === 'win32') {
    const title = process.title.toUpperCase();
    if (title.includes('WINDOWS POWERSHELL')) process.env.SHELL = 'powershell.exe';
    else if (title.includes('COMMAND PROMPT')) process.env.SHELL = 'cmd.exe';
    else process.env.SHELL = 'cmd.exe';
  }

  // return null if we are empty at this point
  if (!process.env.SHELL) {
    console.error('SHELL environment variable is not set.');
    return null;
  }

  // Extract the shell name from the SHELL environment variable
  return path.basename(process.env.SHELL);
};
