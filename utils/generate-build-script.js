/* eslint-disable max-len */
'use strict';

module.exports = (contents, user, gid, socket, mount = '/app') => `
#!/bin/sh
# clean up and setup ssh-auth
if [ -S "${socket}" ]; then
  rm -rf /run/ssh-${user}.sock
  sudo socat UNIX-LISTEN:/run/ssh-${user}.sock,fork,user=${user},group=${gid},mode=777 UNIX-CONNECT:${socket} &
fi

# temp stuff for demo purposes
if command -v git > /dev/null 2>&1; then
  git config --global --add safe.directory ${mount}
fi

${contents}
`;
