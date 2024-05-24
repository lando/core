/* eslint-disable max-len */
'use strict';

module.exports = (contents, user, gid, socket, mount = '/app') => `
#!/bin/sh
# clean up and setup ssh-auth
if [ -S "${socket}" ]; then
  rm -rf /run/ssh-${user}.sock
  sudo socat UNIX-LISTEN:/run/ssh-${user}.sock,fork,user=${user},group=${gid},mode=777 UNIX-CONNECT:${socket} &
  sleep 2
fi

# temp stuff for demo purposes
if command -v git > /dev/null 2>&1; then
  git config --global --add safe.directory ${mount}
fi

${contents}
`;

/*
# Timeout period in seconds
TIMEOUT=30
# Time interval between checks in seconds
INTERVAL=1
# Start time
START_TIME=$(date +%s)
# wait until socket is ready
while true; do
  # Check if ssh-agent is running
  if ssh-add -l > /dev/null 2>&1; then
    break
  fi

  # Check if the timeout period has been reached
  CURRENT_TIME=$(date +%s)
  ELAPSED_TIME=$((CURRENT_TIME - START_TIME))
  if [ $ELAPSED_TIME -ge $TIMEOUT ]; then
    echo "Timeout reached. ssh-agent is not ready."
    exit 1
  fi

  # Wait for the specified interval before checking again
  sleep $INTERVAL
done
*/
