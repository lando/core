#!/bin/lash
set -eo pipefail

# if git exists then we can skip
if [ -x "$(command -v git)" ]; then
  exit 0
fi

case $LANDO_LINUX_PACKAGE_MANAGER in
  apk)
    apk add git
    ;;
  apt)
    apt install -y git
    ;;
  dnf)
    dnf install -y git
    ;;
  microdnf)
    microdnf install git
    ;;
  pacman)
    pacman -Sy --noconfirm git
    ;;
  yum)
    yum install -y git
    ;;
  *)
    abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install git!"
    ;;
esac
