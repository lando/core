#!/bin/bash

# load in any dynamically set envvars
source /etc/lando/environment

# List of characters that exec cannot handle directly
SPECIAL_CHARS='&&|\||;|\$|\`|>|>>|<|2>|&>'

# Join all arguments into a single string
CMD="$*"

# Check if the command contains any special characters
if echo "$CMD" | grep -qE "$SPECIAL_CHARS"; then
  exec sh -c "$CMD"
else
  exec "$@"
fi
