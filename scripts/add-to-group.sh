#!/bin/bash
set -eo pipefail

DEBUG=0
GROUP=""
USER=""

chomp() {
  printf "%s" "${1%$'\n'}"
}

abort() {
  printf "ERROR: %s\n" "$(chomp "$1")" >&2
  exit 1
}

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --debug)
      DEBUG=1
      shift
    ;;
    --group)
      GROUP="$2"
      shift 2
    ;;
    --group=*)
      GROUP="${1#*=}"
      shift
    ;;
    --user)
      USER="$2"
      shift 2
    ;;
    --user=*)
      USER="${1#*=}"
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

# Check that both --group and --user were provided
if [ -z "$GROUP" ] || [ -z "$USER" ]; then
  abort "Usage: $0 --group GROUPNAME --user USERNAME"
fi

# Check if the group exists, create if not
if ! getent group "$GROUP" > /dev/null 2>&1; then
  debug "Group '$GROUP' does not exist. Creating..."
  groupadd "$GROUP" || { abort "Failed to create group."; }
fi

# Add the user to the group
debug "Adding user '$USER' to group '$GROUP'..."
usermod -aG "$GROUP" "$USER" || { abort "Failed to add user to group."; }

echo "User '$USER' successfully added to group '$GROUP'."
