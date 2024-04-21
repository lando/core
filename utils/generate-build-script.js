/* eslint-disable max-len */
'use strict';

module.exports = (contents, user, mount = '/app') => `
#!/bin/sh
# clean up and setup ssh-auth
rm -rf /run/ssh-${user}.sock
sudo socat UNIX-LISTEN:/run/ssh-${user}.sock,fork,user=pirog,group=20,mode=777 UNIX-CONNECT:/run/host-services/ssh-auth.sock &

# temp stuff for demo purposes
git config --global --add safe.directory ${mount}

${contents}
`;
