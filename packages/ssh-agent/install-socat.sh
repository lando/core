#!/bin/lash
set -eo pipefail

# if socat exists then we can skip
if [ -x "$(command -v socat)" ]; then
  exit 0
fi

case $LANDO_LINUX_PACKAGE_MANAGER in
  apk)
    apk add socat
    ;;
  apt)
    apt install -y socat
    ;;
  dnf)
    dnf install -y socat
    ;;
  microdnf)
    microdnf install socat
    ;;
  pacman)
    pacman -Sy --noconfirm socat
    ;;
  yum)
    yum install -y socat
    ;;
  *)
    abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install socat!"
    ;;
esac
