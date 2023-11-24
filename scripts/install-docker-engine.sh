#!/bin/bash
set -eo pipefail

DEBUG=0
INSTALLER="Docker.dmg"
VERSION="24.0.7"
OPTS=

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --debug)
      DEBUG=1
      shift
    ;;
    --installer)
      INSTALLER="$2"
      shift 2
    ;;
    --installer=*)
      INSTALLER="${i#*=}"
      shift
    ;;
    -v|--version)
      VERSION="$2"
      shift 2
    ;;
    -v=*|--version=*)
      VERSION="${i#*=}"
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
debug "DEBUG: $DEBUG"
debug "INSTALLER: $INSTALLER"
debug "VERSION: $VERSION"

# run
sh "$INSTALLER" --version "$VERSION"

# add group
groupadd docker || true

# enable system start?
# systemctl enable docker.service || true
# systemctl enable containerd.service || true
