#!/bin/bash
set -eo pipefail

# load in any dynamically set envvars
source /etc/lando/environment

# exec
debug "Executing npm command: $@"
npm "$@"
