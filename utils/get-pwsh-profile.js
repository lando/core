'use strict';

module.exports = () => {
  // @TODO: we really need to use is-elevated instead of is-root but we are ommiting for now since lando
  // really cant run elevated anyway and its a bunch of extra effort to make all of this aysnc
  // in Lando 4 this will need to be resolved though.
  try {
    const {stdout} = require('./spawn-sync-stringer')(
      'powershell.exe',
      ['-Command', 'echo', require('is-root')() ? '$PROFILE.AllUsersAllHosts' : '$PROFILE'],
      {encoding: 'utf-8'},
    );
    return stdout.trim();
  } catch {
    return '';
  }
};
