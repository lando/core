#!/bin/bash

# if arg 1 is a file then eval its contents
if [ -f "$1" ]; then
  # get the file and shift
  file="$1"
  shift
  # source and eval
  . /etc/lando/landorc
  eval "$(cat "$file")"
# otherwise pass everything through
else
  export BASH_ENV="/etc/lando/landorc"
  exec /bin/bash -c "$*"
fi
