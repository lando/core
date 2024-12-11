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
          `[Environment]::SetEnvironmentVariable("PATH", "${paths};" + [Environment]::GetEnvironmentVariable("PATH")) #landopath`, // eslint-disable-line max-len
          '#landopath',
        ],
      ];

    case 'cmd.exe':
      // its more reliable and consistent to just get PATH from process.env instead of downstream in the child_process
      // which requires we run the command in the shell and has some weirdness escaping spaces and shit
      paths = `${paths};${process.env.PATH}`;
      // @TODO: we really need to use is-elevated instead of is-root but we are ommiting for now since lando
      // really cant run elevated anyway and its a bunch of extra effort to make all of this aysnc
      // in Lando 4 this will need to be resolved though.
      return require('is-root')() ? [[`setx /M PATH "${paths}"`]] : [[`setx PATH "${paths}"`]];

    default:
      return [
        [`export PATH="${paths}:$PATH"; #landopath`, '#landopath'],
      ];
  }
};
