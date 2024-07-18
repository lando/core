#!/bin/lash

# Check if SSH_AUTH_SOCK is set
if [ -z "$SSH_AUTH_SOCK" ]; then
  debug "SSH_AUTH_SOCK is not set. Please start the SSH agent."
  exit 1
fi

# Test the connection to the SSH agent
if ssh-add -l > /dev/null 2>&1; then
  debug "Connected to SSH agent."
elif [ $? -eq 1 ]; then
  # Exit code 1 means the agent is running but has no identities
  debug "SSH agent is running, but has no identities."
else
  # Any other exit code means we couldn't connect to the agent
  debug "Could not connect to SSH agent."
  exit 1
fi
