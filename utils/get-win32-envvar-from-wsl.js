'use strict';

module.exports = async (varname, {debug} = {}) => {
  const args = ['-Command', `[Environment]::GetEnvironmentVariable('${varname}')`];
  const {stdout} = await require('./run-command')('powershell.exe', args, {debug});
  return stdout.trim();
};
