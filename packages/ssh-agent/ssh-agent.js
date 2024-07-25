'use strict';

const path = require('path');

// sets ssh agent and prepares for socating
// DD ssh-agent is a bit strange and we wont use it in v4 plugin but its easiest for demoing purposes
// if you have issues with it its best to do the below
// 0. Close Docker Desktop
// 1. killall ssh-agent
// 2. Start Docker Desktop
// 3. Open a terminal (after Docker Desktop starts)
// 4. ssh-add (use the existing SSH agent, don't start a new one)
// 5. docker run --rm --mount type=bind,src=/run/host-services/ssh-auth.sock,target=/run/host-services/ssh-auth.sock -e SSH_AUTH_SOCK="/run/host-services/ssh-auth.sock" --entrypoint /usr/bin/ssh-add alpine/git -l
module.exports = async service => {
  const {name, uid, gid} = service.user;
  const socket = process.platform === 'linux' ? process.env.SSH_AUTH_SOCK : `/run/host-services/ssh-auth.sock`;

  // if no socket or on windows then just bail
  if (!socket || process.platform === 'win32') return;

  // if not root then we need to do some extra stuff
  if (name !== 'root' && uid !== 0 || uid !== '0') {
    service.addLSF(path.join(__dirname, 'check-ssh-agent.sh'), 'bin/check-ssh-agent');
    service.addHookFile(path.join(__dirname, 'install-socat.sh'), {hook: 'boot'});
    service.addHookFile(path.join(__dirname, 'install-ssh-add.sh'), {hook: 'boot'});
    service.addHookFile(`
      #!/bin/lash
      # make the socket accessible by group
      if [ -S "${socket}" ]; then
        chown :${gid} ${socket}
        chmod 660 ${socket}
        retry check-ssh-agent
      fi
    `, {stage: 'app', hook: 'internal-root', id: 'socat-docker-socket', priority: '000'});
  }

  // finally add the data
  service.addLandoServiceData({
    environment: {
      SSH_AUTH_SOCK: socket,
    },
    volumes: [
      `${socket}:${socket}`,
    ],
  });
};
