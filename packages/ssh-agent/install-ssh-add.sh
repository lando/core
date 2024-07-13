#!/bin/lash
set -eo pipefail

# if ssh-add exists then we can skip
if [ -x "$(command -v ssh-add)" ]; then
  exit 0
fi

case $LANDO_LINUX_PACKAGE_MANAGER in
  apk)
    apk add openssh
    ;;
  apt)
    apt install -y openssh-client
    ;;
  dnf)
    dnf install -y openssh
    ;;
  microdnf)
    microdnf install openssh
    ;;
  pacman)
    pacman -Sy --noconfirm openssh
    ;;
  yum)
    yum install -y openssh-clients
    ;;
  *)
    abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install openssh!"
    ;;
esac
