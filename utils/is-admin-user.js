'use strict';

const os = require('os');

module.exports = async user => {
  // set user to person running this process if its not set
  if (!user) user = os.userInfo().username;

  // posix route
  if (process.platform !== 'win32') {
    const {status, stdout, stderr} = require('./spawn-sync-stringer')('groups', [user]);

    // if we failed for some reason
    if (status !== 0) throw new Error(`Could not determine admin situation: ${stderr}`);

    // get groups
    const groups = stdout.split(' ').map(group => group.trim());

    // darwin wants "admin"
    if (process.platform === 'darwin') return groups.includes('admin');
    // @TODO: linux wasnts TBD
    return false;
  }

  // otherwise false?
  return false;
};
