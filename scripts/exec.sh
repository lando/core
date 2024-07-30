#!/bin/bash

# load in any dynamically set envvars
source /etc/lando/environment

# we need a holder for our expanded args
args=()

# iterate and expand any variables
# @NOTE: does this have other unintended non-variable consequences?
for arg in "$@"; do
  earg=$(eval echo "$arg")
  args+=("$earg")
done

# replace "$@" with args
set -- "${args[@]}"

# DO IT!
debug "$@ with $# args"
exec "$@"
