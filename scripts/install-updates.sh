#!/bin/sh

set -e

# this is pre-lash so we need to source directly
. /etc/lando/lando-utils.sh
. /etc/lando/lando-env.sh

case $LANDO_LINUX_PACKAGE_MANAGER in
  apk)
    apk update
    ;;
  apt)
    apt -y update
    ;;
  dnf)
    dnf -y update
    ;;
  pacman)
    pacman -Syu
    ;;
  yum)
    yum -y update
    ;;
  *)
    abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not run package updates!"
    ;;
esac
