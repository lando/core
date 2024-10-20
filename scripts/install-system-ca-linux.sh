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

# Paths to the os-release files
OS_RELEASE_FILE="/etc/os-release"
USR_OS_RELEASE_FILE="/usr/lib/os-release"

# prefer system level one if it exists as it is more reliable
if [ -f "$USR_OS_RELEASE_FILE" ]; then
  OS_RELEASE_FILE="$USR_OS_RELEASE_FILE"
fi

# throw error if OS_RELEASE_FILE does not exist
if [ ! -f "$OS_RELEASE_FILE" ]; then
  echo "Neither $OS_RELEASE_FILE nor $USR_OS_RELEASE_FILE found." >&2
  exit 1
fi

LANDO_LINUX_DISTRO=$(grep -E '^ID=' "$OS_RELEASE_FILE" | cut -d '=' -f 2 | tr -d '"' || echo "unknown")
LANDO_LINUX_DISTRO_LIKE=$(grep -E '^ID_LIKE=' "$OS_RELEASE_FILE" | cut -d '=' -f 2 | tr -d '"' || echo "")
LANDO_LINUX_NAME=$(grep -E '^NAME=' "$OS_RELEASE_FILE" | cut -d '=' -f 2 | tr -d '"' || echo "unknown")

# Function to set package manager based on distro
set_package_manager() {
  case "$1" in
    alpine)
      export LANDO_LINUX_PACKAGE_MANAGER="apk"
      ;;
    arch|archarm|endeavouros|manjaro)
      export LANDO_LINUX_PACKAGE_MANAGER="pacman"
      ;;
    centos)
      export LANDO_LINUX_PACKAGE_MANAGER="yum"
      ;;
    debian|linuxmint|pop|ubuntu)
      export LANDO_LINUX_PACKAGE_MANAGER="apt"
      ;;
    fedora)
      export LANDO_LINUX_PACKAGE_MANAGER="dnf"
      ;;
    ol)
      export LANDO_LINUX_PACKAGE_MANAGER="microdnf"
      ;;
    *)
      return 1
      ;;
  esac
  return 0
}

# Find correct package manager based on DISTRO
if ! set_package_manager "$LANDO_LINUX_DISTRO"; then
  # If DISTRO is not recognized, check ID_LIKE
  IFS=' ' read -ra DISTRO_LIKE <<< "$LANDO_LINUX_DISTRO_LIKE"
  for distro in "${DISTRO_LIKE[@]}"; do
    if set_package_manager "$distro"; then
      debug "$LANDO_LINUX_NAME ($LANDO_LINUX_DISTRO) is not directly supported. Falling back to $distro-like behavior."
      break
    fi
  done
fi

# If still not set, exit with error
if [ -z "$LANDO_LINUX_PACKAGE_MANAGER" ]; then
  echo "$LANDO_LINUX_DISTRO not supported! Could not locate package manager!" >&2
  exit 1
fi

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
    pacman)
      pacman -Sy --noconfirm ca-certificates-utils
      ;;
    yum)
      yum install -y ca-certificates
      ;;
  esac
fi

# abort if we cannot install the things we need
if [ ! -x "$(command -v update-ca-certificates)" ] && [ ! -x "$(command -v update-ca-trust)" ]; then
  echo "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install ca-certs!" >&2
  exit 1
fi

# move all cas to the correct place and update trust
case $LANDO_LINUX_PACKAGE_MANAGER in
  dnf|microdnf|yum)
    mkdir -p /etc/pki/ca-trust/source/anchors
    cp -rf "$CA" /etc/pki/ca-trust/source/anchors/
    update-ca-trust
    ;;
  pacman)
    mkdir -p /etc/ca-certificates/trust-source/anchors
    cp -rf "$CA" /etc/ca-certificates/trust-source/anchors/
    update-ca-trust
    ;;
  *)
    mkdir -p /usr/local/share/ca-certificates
    cp -rf "$CA" /usr/local/share/ca-certificates/
    update-ca-certificates
    ;;
esac

