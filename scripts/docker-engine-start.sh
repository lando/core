#!/bin/sh
set -e

# Function to check if a Polkit agent is running
is_polkit_agent_running() {
  ps aux | grep -q "[p]olkit" && return 0 || return 1
}

# Check if the DISPLAY or XDG_SESSION_TYPE indicates a desktop environment
if [ -n "$DISPLAY" ] || [ "$XDG_SESSION_TYPE" = "x11" ] || [ "$XDG_SESSION_TYPE" = "wayland" ]; then
  if is_polkit_agent_running; then
    systemctl start docker.service || service docker start
  else
    sudo systemctl start docker.service || sudo service docker start
  fi
else
  sudo systemctl start docker.service || sudo service docker start
fi
