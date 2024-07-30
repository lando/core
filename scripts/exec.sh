#!/bin/bash

# load in any dynamically set envvars
source /etc/lando/environment

# if this is a wrapper script then just execute it
if [[ "$1" == *sh || "$1" == *bash ]]; then
  debug "exec '$@'"
  exec "$@"

# otherwise try to process
else
  args=()

  # eval any args with a $
  for arg in "$@"; do
    if [[ "$arg" == *\$* ]]; then
      earg=$(eval echo "$arg")
      debug "processed '$arg' into '$earg'"
      args+=("$earg")
    else
      args+=("$arg")
    fi
  done

  # replace "$@" with args
  set -- "${args[@]}"

  # DO IT!
  debug "exec '$@'"
  exec "$@"
fi
