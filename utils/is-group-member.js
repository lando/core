'use strict';

const os = require('os');

const posixCmd = user => (['groups', [user]]);
const win32Cmd = user => ([
  'powershell.exe',
  [
    '-Command',
    `Get-LocalGroup | Where-Object { ($_ | Get-LocalGroupMember | Where-Object { $_.Name -like "*\\${user}" }).Count -gt 0 } | Select-Object -Property Name`, // eslint-disable-line max-len
  ],
]);

module.exports = (group, user, platform = process.platform) => {
  // @TODO: throw error if no group specified?
  // set user to person running this process if its not set
  if (!user) user = os.userInfo().username;

  // get the result of the membership command
  const cmd = platform === 'win32' ? win32Cmd(user) : posixCmd(user);
  const {status, stdout, stderr} = require('./spawn-sync-stringer')(...cmd);

  // if we failed for some reason
  if (status !== 0) throw new Error(`Could not determine group situation: ${stderr}`);

  // mac and linux
  if (platform === 'darwin' || platform === 'linux') {
    const groups = stdout.split(' ').map(group => group.trim());
    return groups.includes(group);
  }

  // if windows we have a long command to check
  if (platform === 'win32') {
    const ids = stdout
      .split(os.EOL)
      .map(group => group.trim())
      .filter(group => group !== 'Name' && group !== '----')
      .map(group => group.toUpperCase());

    const matches = ids.filter(id => id === group.toUpperCase() || id.endsWith(group.toUpperCase()));

    return matches.length > 0;
  }

  // otherwise false?
  return false;
};
