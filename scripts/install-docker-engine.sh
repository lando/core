#!/bin/bash
set -eo pipefail

DEBUG=0
INSTALLER="get-docker.sh"
VERSION="27.5.0"
OPTS=

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

trap '{
  EXITCODE=$?

  debug "******************************************************************************"
  debug ""
  debug "DOCKER ENGINE INSTALL FAILED!"
  debug ""
  debug "Usually this happens if you are installing on an unsupported OS or distro."
  debug ""
  debug "Please manually install Docker Engine first and then rereun lando setup."
  debug ""
  debug "You can find the Linux Docker Engine install docs over here:"
  debug "https://docs.docker.com/engine/install/"
  debug ""
  debug "*******************************************************************************"

  exit $EXITCODE;
}' ERR

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
      INSTALLER="${1#*=}"
      shift
    ;;
    -v|--version)
      VERSION="$2"
      shift 2
    ;;
    -v=*|--version=*)
      VERSION="${1#*=}"
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
sh "$INSTALLER" --version "$VERSION" 1>&2

# add group
groupadd docker || true
