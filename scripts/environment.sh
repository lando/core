#!/bin/sh
. /etc/lando/utils.sh

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
    abort "$LANDO_LINUX_DISTRO not supported! Could not locate package manager!"
    ;;
esac

# Use PACKAGE_MANAGER env var if available, argument if not
if ! command -v "$LANDO_LINUX_PACKAGE_MANAGER" > /dev/null 2>&1; then
  abort "$LANDO_LINUX_PACKAGE_MANAGER could not be found."
fi

debug LANDO_LINUX_DISTRO="$LANDO_LINUX_DISTRO"
debug LANDO_LINUX_DISTRO_LIKE="$LANDO_LINUX_DISTRO_LIKE"
debug LANDO_LINUX_PACKAGE_MANAGER="$LANDO_LINUX_PACKAGE_MANAGER"

# unset some build and legacy stuff just to keep LANDO_* slim
# @NOTE: is it a mistake to remove some of these?
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

# Execute sh scripts in /etc/lando/env.d
for script in /etc/lando/env.d/*.sh; do
  if [ -e "$script" ]; then
    if [ -r "$script" ] && [ -f "$script" ]; then
      debug "Sourcing $script"
      . "$script"
    fi
  fi
done
