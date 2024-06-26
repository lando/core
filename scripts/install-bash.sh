#!/bin/sh
set -e

# this is pre-lash so we need to source directly
. /etc/lando/lando-utils.sh
. /etc/lando/lando-env.sh

# if bash exists then we can skip
if [ -x "$(command -v bash)" ]; then
  exit 0
fi

case $PACKAGE_MANAGER in
  apk)
    apk add bash
    ;;
  apt)
    apt install -y bash
    ;;
  dnf)
    dnf install -y bash
    ;;
  pacman)
    pacman -Sy --noconfirm bash
    ;;
  yum)
    yum install -y bash
    ;;
  *)
    abort "$PACKAGE_MANAGER not supported! Could not install bash!"
    ;;
esac
