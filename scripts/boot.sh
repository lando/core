#!/bin/sh
set -e

# this is pre-lash so we need to source directly
. /etc/lando/utils.sh

# run updates
/etc/lando/install-updates.sh

# see if bash exists
if [ ! -x "$(command -v bash)" ]; then
  /etc/lando/install-bash.sh
fi

# Run /etc/lando/build/image/boot.d scripts
/etc/lando/run-hooks.sh image boot

log "boot completed"
