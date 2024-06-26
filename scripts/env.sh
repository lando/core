#!/bin/sh
set -e

. /etc/lando/lando-utils.sh

# Path to the os-release file
OS_RELEASE_FILE="/etc/os-release"

# Check if the os-release file exists
if [ ! -f "$OS_RELEASE_FILE" ]; then
  abort "$OS_RELEASE_FILE not found."
fi

# Parse specific values from os-release
get_distro() {
  DISTRO=$(grep -E '^ID=' "$OS_RELEASE_FILE" | cut -d '=' -f 2 | tr -d '"')
}

# Find correct package manager based on DISTRO
find_package_manager() {
  case "$1" in
    manjaro|arch|archarm)
      PACKAGE_MANAGER="pacman"
      ;;
    debian|ubuntu)
      PACKAGE_MANAGER="apt"
      ;;
    alpine)
      PACKAGE_MANAGER="apk"
      ;;
    fedora)
      PACKAGE_MANAGER="dnf"
      ;;
    centos)
      PACKAGE_MANAGER="yum"
      ;;
    *)
      abort "Platform not supported! Could not locate package manager!"
      ;;
  esac
}

get_distro
find_package_manager "$DISTRO"

# Export values as environment variables
export DISTRO="$DISTRO"
export PACKAGE_MANAGER="$PACKAGE_MANAGER"

# Use PACKAGE_MANAGER env var if available, argument if not
PACKAGE_MANAGER=${PACKAGE_MANAGER:-$1}
if command -v "$PACKAGE_MANAGER" > /dev/null 2>&1; then
  debug "$PACKAGE_MANAGER found."
else
  abort "$PACKAGE_MANAGER could not be found."
fi
