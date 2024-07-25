#!/bin/bash
set -eo pipefail

# this is pre-lash so we need to source directly
. /etc/lando/utils.sh

# get the stage and hook
STAGE="${1:-image}"
HOOK="${2:-boot}"

# run hook scripts
if [ -d "/etc/lando/build/${STAGE}/${HOOK}.d" ]; then
  debug "$(ls -lsa /etc/lando/build/${STAGE}/${HOOK}.d)"
  debug "${tty_magenta}$LANDO_SERVICE_NAME${tty_reset} running /etc/lando/build/${STAGE}/${HOOK}.d scripts"
  for script in /etc/lando/build/${STAGE}/${HOOK}.d/*.sh; do
    if [ -e "$script" ]; then
      if [ -r "$script" ] && [ -f "$script" ]; then
        debug "${tty_magenta}$LANDO_SERVICE_NAME${tty_reset} running hook $script"
        "$script"
      else
        debug "${tty_magenta}$LANDO_SERVICE_NAME${tty_reset} skipping hook $script, not readable or not a file"
      fi
    fi
  done

  # Unset the variable after use
  unset script
  debug "${tty_magenta}$LANDO_SERVICE_NAME${tty_reset} completed $STAGE $HOOK hooks"
fi
