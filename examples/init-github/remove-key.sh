#!/bin/sh
set -e

TOKEN="$1"
TITLE="$2"

ID=$(curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/user/keys | jq -r --arg TITLE "$TITLE" '.[] | select(.title == $TITLE).id')


# TRY TO REMOVE KEY
echo "Trying to remove key $KEYID"...
curl -L \
  -X DELETE \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/user/keys/${ID}"

echo "REMOVED!"
