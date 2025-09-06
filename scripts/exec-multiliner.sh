#!/bin/sh

# ensure at least one argument is provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 <base64_encoded_script> [args...]"
  exit 1
fi

# assign the first argument to ENCODED_SCRIPT and remove it from the arguments list
ENCODED_SCRIPT_CONTENTS="$1"
shift

# create a temporary file with a unique name in /tmp
SCRIPT=$(mktemp /tmp/lando.exec-multiliner.sh.XXXXXX || mktemp)

# decode the Base64 script and write it to the temporary file
echo "$ENCODED_SCRIPT_CONTENTS" | base64 -d > "$SCRIPT"
if [ $? -ne 0 ]; then
  echo "Error: Failed to decode the script."
  rm -f "$SCRIPT"
  exit 1
fi

# make the temporary script executable
chmod +x "$SCRIPT"

# execute the decoded script with the remaining arguments
if [ -f "/etc/lando/exec.sh" ]; then
  /etc/lando/exec.sh "$SCRIPT" "$@"
else
  "$SCRIPT" "$@"
fi
