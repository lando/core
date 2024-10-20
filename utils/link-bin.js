'use strict';

// Modules
const fs = require('fs');
const path = require('path');
const remove = require('./remove');
const write = require('./write-file');

module.exports = (installDir, dest, {filename = 'lando', debug = require('debug')('@lando/link-bin')} = {}) => {
  // ensure installDir and set some things
  fs.mkdirSync(installDir, {recursive: true});
  const posixbin = path.join(installDir, filename);
  const winbin = `${posixbin}.cmd`;

  // on POSIX this is pretty straightforward
  if (process.platform === 'linux' || process.platform === 'darwin') {
    if (fs.existsSync(posixbin)) {
      remove(posixbin);
      debug('removed existing symlink %o', posixbin);
    }

    // set/reset
    fs.symlinkSync(dest, posixbin);
    debug('symlinked @lando/cli %o to %o', dest, posixbin);

  // but on WINDOZE its like FML
  // we need to create wrapper scripts for cmd/powershell and BASHy things
  } else if (process.platform === 'win32') {
    // we strip the extension from the dest because we want lando --help to just show "lando" and not "lando.exe"
    const {dir, name} = path.parse(dest);
    // first we need to create a cmd wrapper
    write(winbin, require('./get-winbin-contents')(path.join(dir, name)));
    // and then posix wrapper
    write(posixbin, require('./get-posixbin-contents')(path.join(dir, name)));

    // and make them executable for good measure
    fs.chmodSync(winbin, 0o755);
    fs.chmodSync(posixbin, 0o755);
  }
};
