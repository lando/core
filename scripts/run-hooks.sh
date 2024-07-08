#!/bin/bash
set -eo pipefail

# this is pre-lash so we need to source directly
. /etc/lando/utils.sh

# get the hook
HOOK="${1:-boot}"

# Run $1 hooks scripts
if [ -d "/etc/lando/${HOOK}.d" ]; then
  debug "running /etc/lando/${HOOK}.d scripts"

  # Execute sh scripts in /etc/lando/boot.d
  for script in /etc/lando/${HOOK}.d/*.sh; do
    if [ -e "$script" ]; then
      if [ -r "$script" ] && [ -f "$script" ]; then
        debug "running hook $script"
        "$script"
      else
        debug "skipping hook $script, not readable or not a file"
      fi
    fi
  done

  # Unset the variable after use
  unset script
fi

log "completed $HOOK hooks"
