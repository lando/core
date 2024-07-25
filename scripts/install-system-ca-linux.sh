#!/bin/bash
set -eo pipefail

CA="~/.lando/certs/LandoCA.crt"
DEBUG=0

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    -c|--ca)
      CA="$2"
      shift 2
    ;;
    -c=*|--ca=*)
      CA="${1#*=}"
      shift
    ;;
    --debug)
      DEBUG=1
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
debug "CA: $CA"
debug "CI: ${CI:-}"
debug "DEBUG: $DEBUG"

# Path to the os-release file
OS_RELEASE_FILE="/etc/os-release"

# Check if the os-release file exists
if [ ! -f "$OS_RELEASE_FILE" ]; then
  echo "$OS_RELEASE_FILE not found." >&2
  exit 1
fi

export LANDO_LINUX_DISTRO=$(grep -E '^ID=' "$OS_RELEASE_FILE" | cut -d '=' -f 2 | tr -d '"')
export LANDO_LINUX_DISTRO_LIKE=$(grep -E '^ID_LIKE=' "$OS_RELEASE_FILE" | cut -d '=' -f 2 | tr -d '"')

# Find correct package manager based on DISTRO
case "$LANDO_LINUX_DISTRO" in
  alpine)
    export LANDO_LINUX_PACKAGE_MANAGER="apk"
    ;;
  arch|archarm|manjaro)
    export LANDO_LINUX_PACKAGE_MANAGER="pacman"
    ;;
  centos)
    export LANDO_LINUX_PACKAGE_MANAGER="yum"
    ;;
  debian|pop|ubuntu)
    export LANDO_LINUX_PACKAGE_MANAGER="apt"
    ;;
  fedora)
    export LANDO_LINUX_PACKAGE_MANAGER="dnf"
    ;;
  ol)
    export LANDO_LINUX_PACKAGE_MANAGER="microdnf"
    ;;
  *)
    echo "$LANDO_LINUX_DISTRO not supported! Could not locate package manager!" >&2
    exit 1
    ;;
esac

# Use PACKAGE_MANAGER env var if available, argument if not
if ! command -v "$LANDO_LINUX_PACKAGE_MANAGER" > /dev/null 2>&1; then
  echo "$LANDO_LINUX_PACKAGE_MANAGER could not be found." >&2
  exit 1
fi

debug LANDO_LINUX_DISTRO="$LANDO_LINUX_DISTRO"
debug LANDO_LINUX_DISTRO_LIKE="$LANDO_LINUX_DISTRO_LIKE"
debug LANDO_LINUX_PACKAGE_MANAGER="$LANDO_LINUX_PACKAGE_MANAGER"

# make sure we have needed commandz
if [ ! -x "$(command -v update-ca-certificates)" ]; then
  case $LANDO_LINUX_PACKAGE_MANAGER in
    apk)
      apk add ca-certificates
      ;;
    apt)
      apt install -y ca-certificates
      ;;
    pacman)
      pacman -Sy --noconfirm ca-certificates-utils
      ;;
  esac
fi

if [ ! -x "$(command -v update-ca-trust)" ]; then
  case $LANDO_LINUX_PACKAGE_MANAGER in
    dnf)
      dnf install -y ca-certificates
      ;;
    microdnf)
      microdnf install ca-certificates
      ;;
    yum)
      yum install -y ca-certificates
      ;;
  esac
fi

# abort if we cannot install the things we need
if [ ! -x "$(command -v update-ca-certificates)" ] && [ ! -x "$(command -v update-ca-trust)" ]; then
  abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install ca-certs!"
fi

# move all cas to the correct place and update trust
case $LANDO_LINUX_PACKAGE_MANAGER in
  dnf|microdnf|yum)
    cp -r "$CA" /etc/pki/ca-trust/source/anchors/
    update-ca-trust
    ;;
  *)
    cp -r "$CA" /usr/local/share/ca-certificates/
    update-ca-certificates
    ;;
esac

