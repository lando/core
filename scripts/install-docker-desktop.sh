#!/bin/bash
set -eo pipefail

DEBUG=0
ACCEPT_LICENSE=0
INSTALLER="Docker.dmg"
USER="$(whoami)"
OPTS=

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --accept-license)
      ACCEPT_LICENSE=1
      shift
    ;;
    --debug)
      DEBUG=1
      shift
    ;;
    --installer)
      INSTALLER="$2"
      shift 2
    ;;
    --installer=*)
      INSTALLER="${1#*=}"
      shift
    ;;
    -u|--user)
      USER="$2"
      shift 2
    ;;
    -u=*|--user=*)
      USER="${1#*=}"
      shift
    ;;
    --)
      shift
      break
    ;;
    -*|--*=)
      shift
    ;;
    *)
      shift
    ;;
  esac
done

# debug
debug "running script with:"
debug "ACCEPT LICENSE: $ACCEPT_LICENSE"
debug "DEBUG: $DEBUG"
debug "INSTALLER: $INSTALLER"
debug "USER: $USER"

# add accept license if set
if [ "${ACCEPT_LICENSE}" == 1 ]; then OPTS="$OPTS --accept-license"; fi

# run
hdiutil attach "$INSTALLER"
/Volumes/Docker/Docker.app/Contents/MacOS/install --user="$USER" $OPTS
hdiutil detach /Volumes/Docker
