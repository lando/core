#!/bin/lash

# if sudo exists then we can skip
if [ -x "$(command -v sudo)" ]; then
  exit 0
fi

case $PACKAGE_MANAGER in
  apk)
    apk add sudo
    ;;
  apt)
    apt install -y sudo
    ;;
  dnf)
    dnf install -y sudo
    ;;
  pacman)
    pacman -Sy --noconfirm sudo
    ;;
  yum)
    yum install -y sudo
    ;;
  *)
    abort "$PACKAGE_MANAGER not supported! Could not install sudo!"
    ;;
esac
