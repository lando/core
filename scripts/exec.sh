#!/bin/bash

# load in any dynamically set envvars
source /etc/lando/environment

debug "$@ with $# args"
exec "$@"
