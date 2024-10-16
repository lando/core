#!/bin/sh

set -e

# Set defaults
: ${SILENT:=$1}

# Echo helper to recognize silence
if [ "$SILENT" = "--silent" ]; then
  LANDO_QUIET="yes"
fi

# Get the lando logger
. /helpers/log.sh

# Set the module
LANDO_MODULE="addcert"

# Bail if we are not root
if [ $(id -u) != 0 ]; then
  lando_warn "Only the root user can add certs!"
  lando_warn "This may prevent some hostnames from working correctly when served over https"
  exit 0
fi

# Vars and defaults
: ${LANDO_CA_CERT:="/lando/certs/LandoCA.crt"}
: ${LANDO_CA_KEY:="/lando/certs/LandoCA.key"}
: ${CA_DIR:="/usr/local/share/ca-certificates"}
: ${CA_CERT_FILENAME:="LandoCA.crt"}
: ${CA_CERT_CONTAINER:="$CA_DIR/$CA_CERT_FILENAME"}

# Make sure our cert directories exists
mkdir -p /certs $CA_DIR

# Enable SSL on apache if we have to
#
# @NOTE: Once we decouple the php container from apache like we do for nginx we can
# move this to the apache service
# @NOTE: the neccessity of this has been lost to the sands of time so we are just keeping it around
# because we dont know
if [ -f "/etc/apache2/mods-available/ssl.load" ]; then
  lando_info "Enabling apache ssl modz"
  cp -rf /etc/apache2/mods-available/ssl* /etc/apache2/mods-enabled || true
  cp -rf /etc/apache2/mods-available/socache_shmcb* /etc/apache2/mods-enabled || true
fi

# @TODO: create a combined CA if the older DOMANCERT still exists?
# @TODO: just print the entire /lando/certs and /certs dirs?

# Pemify
cat /certs/cert.crt /certs/cert.key > /certs/cert.pem

# This is a weird hack to handle recent changes to bitnami's apache image without causing
# breaking changes
cp -f /certs/cert.crt /certs/server.crt
cp -f /certs/cert.key /certs/server.key

# Set the cert and key on host to host-uid/gid ownership
chown "$LANDO_HOST_UID:$LANDO_HOST_GID" "$LANDO_SERVICE_CERT"
chown "$LANDO_HOST_UID:$LANDO_HOST_GID" "$LANDO_SERVICE_KEY"

# Trust our root CA
if [ ! -f "$CA_CERT_CONTAINER" ]; then
  mkdir -p /usr/local/share/ca-certificates
  lando_info "$CA_CERT_CONTAINER not found... copying $LANDO_CA_CERT over"
  cp -f $LANDO_CA_CERT $CA_CERT_CONTAINER
  echo "$CA_CERT_FILENAME" >> /etc/ca-certificates.conf
fi
