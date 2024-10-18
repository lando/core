#!/bin/lash
set -eo pipefail

# add envfile
touch /etc/lando/env.d/install-ca-certs.sh

# make sure we have needed commandz
if [ ! -x "$(command -v update-ca-certificates)" ]; then
  case $LANDO_LINUX_PACKAGE_MANAGER in
    apk)
      apk add ca-certificates
      ;;
    apt)
      apt install -y ca-certificates
      ;;
  esac
fi

if [ ! -x "$(command -v update-ca-trust)" ]; then
  case $LANDO_LINUX_PACKAGE_MANAGER in
    dnf)
      dnf install -y ca-certificates
      ;;
    microdnf)
      microdnf install ca-certificates
      ;;
    pacman)
      pacman -Sy --noconfirm ca-certificates-utils
      ;;
    yum)
      yum install -y ca-certificates
      ;;
  esac
fi

# abort if we cannot install the things we need
if [ ! -x "$(command -v update-ca-certificates)" ] && [ ! -x "$(command -v update-ca-trust)" ]; then
  abort "$LANDO_LINUX_PACKAGE_MANAGER not supported! Could not install ca-certs!"
fi

# move all cas to the correct place and update trust
case $LANDO_LINUX_PACKAGE_MANAGER in
  dnf|microdnf|yum)
    mkdir -p /etc/pki/ca-trust/source/anchors
    cp -r /etc/lando/ca-certificates/.  /etc/pki/ca-trust/source/anchors/
    echo "export LANDO_CA_DIR=/etc/pki/ca-trust/source/anchors" >> /etc/lando/env.d/install-ca-certs.sh
    echo "export LANDO_CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem" >> /etc/lando/env.d/install-ca-certs.sh
    update-ca-trust
    ;;
  pacman)
    mkdir -p /etc/ca-certificates/trust-source/anchors
    cp -r /etc/lando/ca-certificates/.  /etc/ca-certificates/trust-source/anchors/
    echo "export LANDO_CA_DIR=/etc/ca-certificates/trust-source/anchors" >> /etc/lando/env.d/install-ca-certs.sh
    echo "export LANDO_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt" >> /etc/lando/env.d/install-ca-certs.sh
    update-ca-trust
    ;;
  *)
    mkdir -p /usr/local/share/ca-certificates
    cp -r /etc/lando/ca-certificates/.  /usr/local/share/ca-certificates/
    echo "export LANDO_CA_DIR=/etc/ssl/certs/" >> /etc/lando/env.d/install-ca-certs.sh
    echo "export LANDO_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt" >> /etc/lando/env.d/install-ca-certs.sh
    update-ca-certificates
    ;;
esac
