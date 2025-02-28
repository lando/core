#!/bin/bash
set -eo pipefail

# load in any dynamically set envvars
source /etc/lando/environment

# exec
# TODO: lando banner?
debug "Executing start up command: $@"
exec "$@"
