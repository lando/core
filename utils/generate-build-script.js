/* eslint-disable max-len */
'use strict';

module.exports = (contents, user, gid, socket, mount = '/app') => `
#!/bin/sh

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
    rm -rf /run/ssh-${user}.sock
    sudo socat UNIX-LISTEN:/run/ssh-${user}.sock,fork,user=${user},group=${gid},mode=777 UNIX-CONNECT:${socket} &
    retry_with_backoff ssh-add -l > /dev/null 2>&1;
  fi
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
