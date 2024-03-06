'use strict';

module.exports = () => {
  try {
    const {stdout} = require('./spawn-sync-stringer')(
      'powershell',
      ['-Command', '$PSVersionTable.PSVersion.Major'],
      {encoding: 'utf-8'},
    );
    return parseInt(stdout);
  } catch {
    return '';
  }
};
