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

# minmax
LANDO_GIDMIN="$LANDO_GID"
LANDO_GIDMAX="600100000"
LANDO_UIDMIN="$LANDO_UID"
LANDO_UIDMAX="$(($LANDO_UID + 10))"
debug LANDO_GID="$LANDO_GID"
debug LANDO_USER="$LANDO_USER"
debug LANDO_UID="$LANDO_UID"
debug LANDO_GIDMIN="$LANDO_GIDMIN"
debug LANDO_GIDMAX="$LANDO_GIDMAX"
debug LANDO_UIDMIN="$LANDO_UIDMIN"
debug LANDO_UIDMAX="$LANDO_UIDMAX"

# if we have no LANDOUSER then throw an error
if [ -z "${LANDO_USER+x}" ]; then
  abort "You must provide at least a username!"
fi

# ensure /etc/login.defs exists
if [ ! -e "/etc/login.defs" ]; then
  touch "/etc/login.defs"
fi

# Update UID_MIN and UID_MAX in login.defs
if [ -n "${LANDO_UID+x}" ]; then
  sed -i '/^UID_MIN/d' /etc/login.defs
  sed -i '/^UID_MAX/d' /etc/login.defs
  echo "UID_MIN ${LANDO_UIDMIN}" >> /etc/login.defs
  echo "UID_MAX ${LANDO_UIDMAX}" >> /etc/login.defs
fi

# Update GID_MIN and GID_MAX in login.defs
if [ -n "${LANDO_GID+x}" ]; then
  sed -i '/^GID_MIN/d' /etc/login.defs
  sed -i '/^GID_MAX/d' /etc/login.defs
  echo "GID_MIN ${LANDO_GIDMIN}" >> /etc/login.defs
  echo "GID_MAX ${LANDO_GIDMAX}" >> /etc/login.defs
fi

# if we have gid then make sure we add a group first if needed
if [ -n "${LANDO_GID+x}" ]; then
  getent group "$LANDO_GID" > /dev/null || groupadd -g "$LANDO_GID" "$LANDO_USER"
fi

# create the user based on what we have
if [ -z "${LANDO_GID+x}" ] && [ -z "${LANDO_UID+x}" ]; then
  useradd -l -m "$LANDO_USER"
elif [ -z "${LANDO_GID+x}" ] && [ -n "${LANDO_UID+x}" ]; then
  useradd -l -u "$LANDO_UID" -m "$LANDO_USER"
elif [ -n "${LANDO_GID+x}" ] && [ -n "${LANDO_UID+x}" ]; then
  useradd -l -u "$LANDO_UID" -m -g "$LANDO_GID" "$LANDO_USER"
fi
