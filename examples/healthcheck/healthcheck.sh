#!/bin/bash
set -eo pipefail

main () {
  local healthfile=/healthfile

  # if healthcheck file does not exist then create it
  if [ ! -f $healthfile ]; then
    touch $healthfile
  fi
  # append an X to the healthfile
  echo -n "X" >> $healthfile
  # run our "healthcheck"
  cat $healthfile | grep -w "XXXXX" && rm -rf $healthfile
}

main
