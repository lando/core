'use strict';

module.exports = (paths = [], shell = require('./get-user-shell')()) => {
  // return NADA if no paths
  if (paths.length === 0) return [];

  // stringify paths
  paths = require('./get-path-string')(paths, shell);

  // otherwise switchit
  switch (shell) {
    case 'powershell.exe':
      return [
        ['# Lando'],
        [
          `[Environment]::SetEnvironmentVariable("PATH", "${paths};" + [Environment]::GetEnvironmentVariable("PATH", "User"), "User") #landopath`, // eslint-disable-line max-len
          '#landopath',
        ],
      ];

    case 'cmd.exe':
      return [
        [`setx /M PATH "%${paths};%PATH%"`],
      ];

    default:
      return [
        ['# Lando'],
        [`export PATH="${paths}\${PATH+:$PATH}"; #landopath`, '#landopath'],
      ];
  }
};
