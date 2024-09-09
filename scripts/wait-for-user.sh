#!/bin/bash

set -e

# user info
user="${1:-$LANDO_WEBROOT_USER}"
id="${2:-$LANDO_HOST_UID}"
gid="${3:-$LANDO_HOST_GID}"

# retry settings
attempt=0
delay=2
retry=25

until [ "$attempt" -ge "$retry" ]
do
  id -u "$user" | grep "$id" &>/dev/null && id -g "$user" | grep "$gid" &>/dev/null && break
  attempt=$((attempt+1))
  sleep "$delay"
done
