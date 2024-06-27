#!/bin/sh
set -e

. /etc/lando/lando-utils.sh

# Path to the os-release file
OS_RELEASE_FILE="/etc/os-release"

# Check if the os-release file exists
if [ ! -f "$OS_RELEASE_FILE" ]; then
  abort "$OS_RELEASE_FILE not found."
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
  debian|ubuntu)
    export LANDO_LINUX_PACKAGE_MANAGER="apt"
    ;;
  fedora)
    export LANDO_LINUX_PACKAGE_MANAGER="dnf"
    ;;
  ol)
    export LANDO_LINUX_PACKAGE_MANAGER="microdnf"
    ;;
  *)
    abort "$LANDO_LINUX_DISTRO not supported! Could not locate package manager!"
    ;;
esac

# Use PACKAGE_MANAGER env var if available, argument if not
if command -v "$LANDO_LINUX_PACKAGE_MANAGER" > /dev/null 2>&1; then
  debug "$LANDO_LINUX_PACKAGE_MANAGER found."
else
  abort "$LANDO_LINUX_PACKAGE_MANAGER could not be found."
fi

debug LANDO_LINUX_DISTRO="$LANDO_LINUX_DISTRO"
debug LANDO_LINUX_DISTRO_LIKE="$LANDO_LINUX_DISTRO_LIKE"
debug LANDO_LINUX_PACKAGE_MANAGER="$LANDO_LINUX_PACKAGE_MANAGER"
