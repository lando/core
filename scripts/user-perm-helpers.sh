#!/bin/sh

# Source da helpas
. /helpers/log.sh

# Set the module
LANDO_MODULE="userperms"

# Adding user if needed
add_user() {
  local USER=$1
  local GROUP=$2
  local WEBROOT_UID=$3
  local WEBROOT_GID=$4
  if ! getent group | cut -d: -f1 | grep "$GROUP" > /dev/null 2>&1; then addgroup -g "$WEBROOT_GID" "$GROUP" 2>/dev/null; fi
  if ! id -u "$USER" > /dev/null 2>&1; then adduser -H -D -G "$GROUP" -u "$WEBROOT_UID" "$USER" "$GROUP" 2>/dev/null; fi
}

# Verify user
verify_user() {
  local USER=$1
  local GROUP=$2
  id -u "$USER" > /dev/null 2>&1
  groups "$USER" | grep "$GROUP" > /dev/null 2>&1
  if command -v chsh > /dev/null 2>&1 ; then
    if command -v /bin/bash > /dev/null 2>&1 ; then
      chsh -s /bin/bash $USER || true
    fi;
  else
    true
    # is there a chsh we can use? do we need to?
  fi;
}

# Reset user
reset_user() {
  local USER=$1
  local GROUP=$2
  local HOST_UID=$3
  local HOST_GID=$4
  local DISTRO=$5
  local USER_HOME=$6
  local HOST_GROUP=$GROUP
  if getent group "$HOST_GID" 1>/dev/null 2>/dev/null; then
    HOST_GROUP=$(getent group "$HOST_GID" | cut -d: -f1)
  fi
  if [ "$DISTRO" = "alpine" ]; then
    deluser "$USER" 2>/dev/null
    addgroup -g "$HOST_GID" "$GROUP" 2>/dev/null | addgroup "$GROUP" 2>/dev/null
    addgroup -g "$HOST_GID" "$HOST_GROUP" 2>/dev/null
    adduser -u "$HOST_UID" -G "$HOST_GROUP" -h "$USER_HOME" -D "$USER" 2>/dev/null
    adduser "$USER" "$GROUP" 2>/dev/null
  else
    if [ "$(id -u $USER)"  != "$HOST_UID" ]; then
      usermod -o -u "$HOST_UID" "$USER" 2>/dev/null
    fi
    groupmod -o -g "$HOST_GID" "$GROUP" 2>/dev/null || true
    if [ "$(id -g $USER)"  != "$HOST_GID" ]; then
      usermod -g "$HOST_GID" "$USER" 2>/dev/null || true
    fi
  fi;
  # If this mapping is incorrect lets abort here
  if [ "$(id -u $USER)" != "$HOST_UID" ]; then
    lando_warn "Looks like host/container user mapping was not possible! aborting..."
    exit 0
  fi
}

# Perm sweeper
# Note that while the order of these things might seem weird and/or redundant
# it is designed to fix more "critical" directories first
perm_sweep() {
  local USER=$1
  local GROUP=$2
  local USER_HOME=$3
  local OTHER_DIR=$4

  # Do other dirs first if we have them
  if [ ! -z "$OTHER_DIR" ]; then
    chown -R $USER:$GROUP $OTHER_DIR > /tmp/perms.out 2> /tmp/perms.err || true
  fi

  # Do permission sweep and wait for completion
  chown -R $USER:$GROUP /app > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned /app"
  chown -R $USER:$GROUP /tmp > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned /tmp"
  [ -d /user ] && chown -R $USER:$GROUP /user > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned /user"
  chown -R $USER:$GROUP /var/www > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned /var/www"
  chmod 755 /var/www

  chown -R $USER:$GROUP /usr/local > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned /usr/local"

  # Make sure we chown the $USER home directory
  [ -d "$USER_HOME" ] && chown -R $USER:$GROUP "$USER_HOME" > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned $USER_HOME"
  [ -d /lando/keys ] && chown -R $USER:$GROUP /lando/keys > /tmp/perms.out 2> /tmp/perms.err || true
  lando_info "chowned /lando"
}
