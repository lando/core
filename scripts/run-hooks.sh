#! /bin/sh
set -e

# this is pre-lash so we need to source directly
. /etc/lando/lando-utils.sh

# get the hook
HOOK="${1:-boot}"

# Run $1 hooks scripts
if [ -d "/etc/lando/${HOOK}.d" ]; then
  debug "running /etc/lando/${HOOK}.d scripts"
  # Execute sh scripts in /etc/lando/boot.d
  for script in "/etc/lando/${HOOK}.d/*.sh"; do
    # Check if the script is readable and is a file
    if [ -r "$script" ] && [ -f "$script" ]; then
      debug "executing $script"
      . "$script"
    else
      debug "skipping $script, not readable or not a file"
    fi
  done

  # Unset the variable after use
  unset script
fi

log "completed $hook hooks"
