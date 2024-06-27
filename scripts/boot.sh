#!/bin/sh
set -e

true

# this is pre-lash so we need to source directly
. /etc/lando/lando-utils.sh

# run updates
/etc/lando/install-updates.sh

# see if bash exists
if [ ! -x "$(command -v bash)" ]; then
  /etc/lando/install-bash.sh
fi

# Run /etc/lando/boot.d scripts
/etc/lando/run-hooks.sh boot

log "boot completed"
