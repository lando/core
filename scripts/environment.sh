#!/bin/sh
. /etc/lando/utils.sh

# Paths to the os-release files
OS_RELEASE_FILE="/etc/os-release"
USR_OS_RELEASE_FILE="/usr/lib/os-release"

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

export LANDO_LINUX_DISTRO
export LANDO_LINUX_DISTRO_LIKE
export LANDO_LINUX_NAME

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
  IFS=' ' set -- $LANDO_LINUX_DISTRO_LIKE
  for distro in "$@"; do
    if set_package_manager "$distro"; then
      debug "$LANDO_LINUX_NAME ($LANDO_LINUX_DISTRO) is not directly supported. Falling back to $distro-like behavior."
      break
    fi
  done

  # If still not set, exit with error
  if [ -z "$LANDO_LINUX_PACKAGE_MANAGER" ]; then
    echo "$LANDO_LINUX_DISTRO not supported! Could not locate package manager!" >&2
    exit 1
  fi
fi

# Use PACKAGE_MANAGER env var if available, argument if not
if ! command -v "$LANDO_LINUX_PACKAGE_MANAGER" > /dev/null 2>&1; then
  abort "$LANDO_LINUX_PACKAGE_MANAGER could not be found."
fi

debug LANDO_LINUX_DISTRO="$LANDO_LINUX_DISTRO"
debug LANDO_LINUX_DISTRO_LIKE="$LANDO_LINUX_DISTRO_LIKE"
debug LANDO_LINUX_PACKAGE_MANAGER="$LANDO_LINUX_PACKAGE_MANAGER"

# Unset some build and legacy stuff just to keep LANDO_* slim
unset BITNAMI_DEBUG
unset LANDO_APP_COMMON_NAME
unset LANDO_APP_NAME
unset LANDO_APP_PROJECT
unset LANDO_APP_ROOT
unset LANDO_APP_ROOT_BIND
unset LANDO_CA_CERT
unset LANDO_CA_KEY
unset LANDO_CONFIG_DIR
unset LANDO_HOST_HOME
unset LANDO_IMAGE_GROUP
unset LANDO_IMAGE_USER
unset LANDO_INFO
unset LANDO_LOAD_KEYS
unset LANDO_MOUNT
unset LANDO_PROXY_NAMES
unset LANDO_PROXY_PASSTHRU
unset LANDO_WEBROOT_GROUP
unset LANDO_WEBROOT_USER

# envvar so we can test if this loaded
export LANDO_ENVIRONMENT="loaded"

# if we have a project mount then reset LANDO_MOUNT
if [ -n "$LANDO_PROJECT_MOUNT" ]; then
  export LANDO_MOUNT="$LANDO_PROJECT_MOUNT"
fi

# Execute sh scripts in /etc/lando/env.d
if ls /etc/lando/env.d/*.sh > /dev/null 2>&1; then
  for script in /etc/lando/env.d/*.sh; do
    if [ -r "$script" ] && [ -f "$script" ]; then
      debug "Sourcing $script"
      . "$script"
    fi
  done
fi
