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
module.exports = service => {
  const {name, uid, gid} = service.user;
  const socket = process.platform === 'linux' ? process.env.SSH_AUTH_SOCK : `/run/host-services/ssh-auth.sock`;

  // if no socket then just bail
  if (!socket) return;

  // discover the socater
  const socater = (name === 'root' || uid === 0 || uid === '0') ? socket : `/run/ssh-${name}.sock`;

  // if not root then we need to do some extra stuff
  if (name !== 'root' && uid !== 0 || uid !== '0') {
    service.addHookFile(path.join(__dirname, 'install-socat.sh'), {hook: 'boot'});
    service.addHookFile(path.join(__dirname, 'install-ssh-add.sh'), {hook: 'boot'});
    service.addHookFile(`
      #!/bin/bash
      set -e

      retry_with_backoff() {
        local max_attempts=\${MAX_ATTEMPTS-10}
        local initial_delay=\${INITIAL_DELAY-1}
        local factor=\${FACTOR-2}
        local attempt=1
        local delay=$initial_delay

        while true; do
          "$@"
          local status=$?
          if [ $status -eq 0 ]; then
            return 0
          fi

          if [ $attempt -ge $max_attempts ]; then
            echo "Attempt $attempt failed and there are no more attempts left!"
            return $status
          fi

          echo "Attempt $attempt failed! Retrying in $delay seconds..."
          sleep $delay
          attempt=$((attempt + 1))
          delay=$((delay * factor))
        done
      }

      # clean up and setup ssh-auth
      if command -v socat >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
        if [ -S "${socket}" ]; then
          rm -rf /run/ssh-${name}.sock
          socat \
            UNIX-LISTEN:/run/ssh-${name}.sock,fork,user=${name},group=${gid},mode=777 \
            UNIX-CONNECT:${socket} &
          retry_with_backoff ssh-add -l
        fi
      fi
    `, {stage: 'app', hook: 'internal-root', id: 'socat-docker-socket', priority: '000'});
  }

  // finally add the data
  service.addLandoServiceData({
    environment: {
      SSH_AUTH_SOCK: socater,
    },
    volumes: [
      `${socket}:${socket}`,
    ],
  });
};
