/* eslint-disable max-len */
'use strict';

module.exports = (contents, user, gid, socket, mount = '/app') => `
#!/bin/sh
# clean up and setup ssh-auth
# @TODO: only run if socket exists?
# if [ -S "${socket}" ]; then
echo "socat"
rm -rf /run/ssh-${user}.sock
sudo socat UNIX-LISTEN:/run/ssh-${user}.sock,fork,user=${user},group=${gid},mode=777 UNIX-CONNECT:${socket} &

# temp stuff for demo purposes
# @TODO: only run if git exists?
# if command -v git > /dev/null 2>&1; then
git config --global --add safe.directory ${mount}

${contents}
`;
