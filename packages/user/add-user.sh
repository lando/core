#!/bin/lash
set -eo pipefail

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --gid)
      LANDO_GID="$2"
      shift 2
    ;;
    --gid=*)
      LANDO_GID="${1#*=}"
      shift
    ;;
    --uid)
      LANDO_UID="$2"
      shift 2
    ;;
    --uid=*)
      LANDO_UID="${1#*=}"
      shift
    ;;
    --name)
      LANDO_USER="$2"
      shift 2
    ;;
    --name=*)
      LANDO_USER="${1#*=}"
      shift
    ;;
    --)
      shift
      break
    ;;
    -*|--*=)
      shift
    ;;
    *)
      shift
    ;;
  esac
done

# if we have no LANDOUSER then throw an error
if [ -z "${LANDO_USER+x}" ]; then
  abort "You must provide at least a username!"
fi

# special dispensation
if [ "${LANDO_USER}" == 'root' ] || [ "${LANDO_UID}" == '0' ]; then
  debug "Running as root, no need for creation or map!"
  exit 0
fi

# Set min and max UID/GID values
LANDO_GIDMIN="$LANDO_GID"
LANDO_GIDMAX="600100000"
LANDO_UIDMIN="$LANDO_UID"
LANDO_UIDMAX="$((LANDO_UID + 10))"

# Debug information
debug "LANDO_GID=${LANDO_GID}"
debug "LANDO_USER=${LANDO_USER}"
debug "LANDO_UID=${LANDO_UID}"
debug "LANDO_GIDMIN=${LANDO_GIDMIN}"
debug "LANDO_GIDMAX=${LANDO_GIDMAX}"
debug "LANDO_UIDMIN=${LANDO_UIDMIN}"
debug "LANDO_UIDMAX=${LANDO_UIDMAX}"

# Ensure /etc/login.defs exists
if [ ! -e "/etc/login.defs" ]; then
  touch "/etc/login.defs"
fi

# Update UID_MIN and UID_MAX in /etc/login.defs
if [ -n "${LANDO_UID}" ]; then
  sed -i '/^UID_MIN/d' /etc/login.defs
  sed -i '/^UID_MAX/d' /etc/login.defs
  echo "UID_MIN ${LANDO_UIDMIN}" >> /etc/login.defs
  echo "UID_MAX ${LANDO_UIDMAX}" >> /etc/login.defs
fi

# Update GID_MIN and GID_MAX in /etc/login.defs
if [ -n "${LANDO_GID}" ]; then
  sed -i '/^GID_MIN/d' /etc/login.defs
  sed -i '/^GID_MAX/d' /etc/login.defs
  echo "GID_MIN ${LANDO_GIDMIN}" >> /etc/login.defs
  echo "GID_MAX ${LANDO_GIDMAX}" >> /etc/login.defs
fi

# Add group if GID is provided and group does not exist
if [ -n "${LANDO_GID}" ]; then
  if ! getent group "$LANDO_GID" > /dev/null; then
    groupadd -g "$LANDO_GID" "$LANDO_USER" || groupadd -g "$LANDO_GID" lando
  fi
fi

# Update existing user or create a new user
if id "$LANDO_USER" &>/dev/null; then
  # User exists, update UID and GID
  ouid="$(id -u "$LANDO_USER")"
  ogid="$(id -g "$LANDO_USER")"
  debug "user $LANDO_USER already exists with id ${ouid}:${ogid}"
  debug "updating ${LANDO_USER} to ${LANDO_UID}:${LANDO_GID}"
  if [ -n "${LANDO_UID}" ]; then
    usermod -u "$LANDO_UID" "$LANDO_USER"
    if [ -n "${LANDO_GID}" ]; then
      usermod -g "$LANDO_GID" "$LANDO_USER"
    fi
    find / \
      \( -path /proc -o -path /sys -o -path /dev \) -prune -o \
      -user "$ouid" -exec chown -h "$LANDO_UID" {} + 2>/dev/null
  fi
else
  # User does not exist, create new user
  debug "creating new user ${LANDO_USER}:${LANDO_UID}:${LANDO_GID}"
  if [ -z "${LANDO_GID}" ] && [ -z "${LANDO_UID}" ]; then
    useradd -l -m "$LANDO_USER"
  elif [ -z "${LANDO_GID}" ] && [ -n "${LANDO_UID}" ]; then
    useradd -l -u "$LANDO_UID" -m "$LANDO_USER"
  elif [ -n "${LANDO_GID}" ] && [ -n "${LANDO_UID}" ]; then
    useradd -l -u "$LANDO_UID" -m -g "$LANDO_GID" "$LANDO_USER"
  fi
fi
