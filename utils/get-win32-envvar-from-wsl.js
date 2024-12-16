'use strict';

module.exports = varname => {
  const args = ['-Command', `[Environment]::GetEnvironmentVariable('${varname}')`];
  const {stdout} = require('./spawn-sync-stringer')('powershell.exe', args, {encoding: 'utf-8'});
  return stdout.trim();
};
