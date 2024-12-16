'use strict';

module.exports = ({
  args = [],
  debug = require('debug')('@lando/shutdown-os'),
  message = 'Lando wants to restart your computer',
  password = undefined,
  type = 'restart',
  wait = process.landoPlatform === 'win32' || process.platform === 'win32' ? 5 : 'now',
  platform = process.landoPlatform ?? process.platform,
} = {}) => {
  debug('shutdown with %o %o', type, {message, wait});

  switch (platform) {
    case 'darwin':
      args.push('shutdown');
      // handle the restart type
      if (type === 'logout') args.push('-r');
      else if (type === 'restart') args.push('-r');
      else if (type === 'shutdown') args.push('-h');
      else args.push('-r');
      // the waiting is the hardest part
      args.push(wait);
      // message
      args.push(`"${message}"`);
      return require('./run-elevated')(args, {password, debug});
    case 'linux':
      // handle the restart type
      if (type === 'logout') args.push('--reboot');
      else if (type === 'restart') args.push('--reboot');
      else if (type === 'shutdown') args.push('--poweroff');
      else args.push('--reboot');
      // the waiting is the hardest part
      args.push(wait);
      // message
      args.push(`"${message}"`);

      return require('./run-command')('shutdown', args, {debug});
    case 'win32':
      // handle the restart type
      if (type === 'logout') args.push('/l');
      else if (type === 'restart') args.push('/r');
      else if (type === 'shutdown') args.push('/s');
      else args.push('r');
      // the waiting is the hardest part
      args.push('/t');
      args.push(wait);
      // add a comment
      args.push('/c');
      args.push(message);

      return require('./run-command')('shutdown.exe', args, {debug});
    case 'wsl':
      args.push('-Command');
      args.push(`wsl --terminate ${process.env.WSL_DISTRO_NAME}`);
      return require('./run-command')('powershell.exe', args, {debug});
  }
};
