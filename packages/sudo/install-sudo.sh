#!/bin/lash
set -eo pipefail

# if sudo exists then we can skip
if [ -x "$(command -v sudo)" ]; then
  exit 0
fi

case $LANDO_LINUX_PACKAGE_MANAGER in
  apk)
    apk add sudo
    ;;
  apt)
    apt install -y sudo
    ;;
  dnf)
    dnf install -y sudo
    ;;
  microdnf)
    microdnf install sudo
    ;;
  pacman)
    pacman -Sy --noconfirm sudo
    ;;
  yum)
    yum install -y sudo
    ;;
  *)
    abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install sudo!"
    ;;
esac
