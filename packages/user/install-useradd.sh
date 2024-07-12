#!/bin/lash
set -eo pipefail

# make sure we have user add
if [ ! -x "$(command -v useradd)" ]; then
  case $LANDO_LINUX_PACKAGE_MANAGER in
    apk)
      apk add shadow
      ;;
    apt)
      apt install -y passwd
      ;;
    dnf)
      dnf install -y shadow-utils
      ;;
    microdnf)
      microdnf install shadow-utils
      ;;
    pacman)
      pacman -Sy --noconfirm shadow
      ;;
    yum)
      yum install -y shadow-utils
      ;;
    *)
      abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install useradd!"
      ;;
  esac
fi
