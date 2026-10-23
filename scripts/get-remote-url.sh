#!/bin/bash

set -e

# Get the URL arg and opz
URL=$1
# Get options
if [ "$2" = '""' ]; then
  OPTIONS=
else
  OPTIONS="$2"
fi

SRC_DIR=/tmp/source

is_http_url() {
  case "$1" in
    http://*|https://*) return 0 ;;
    *) return 1 ;;
  esac
}

is_git_url() {
  case "$1" in
    ssh://*|git://*|git@*|*.git) return 0 ;;
  esac
  case "$1" in
    *://*) return 1 ;;
    *@*:*) return 0 ;;
  esac
  return 1
}

if is_git_url "$URL"; then
  TYPE="git repo"
elif is_http_url "$URL" && git ls-remote "$URL" --quiet >/dev/null 2>&1; then
  TYPE="git repo"
elif is_http_url "$URL"; then
  TYPE="tar archive"
else
  echo "Could not fetch $URL as a git repository." >&2
  echo "Refusing to download a non-http(s) URL as an archive." >&2
  exit 1
fi

# Do some basic reporting
echo "Detected that $URL is a $TYPE"

# Start with a clear slate
rm -rf "$SRC_DIR"
mkdir -p "$SRC_DIR"

# Either git
if [ "$TYPE" = "git repo" ]; then
  if [ -d "/app/.git" ]; then
    echo "Whoooops! Looks like you've already got a git repo here!"
    echo "Either delete this repo or try to lando init in a folder without .git in it"
    exit 666
  fi
  git -C "$SRC_DIR" clone $OPTIONS "$URL" ./
  echo "Copying git clone over to /app..."
  cp -rfT "$SRC_DIR" /app
fi

# Or archive
if [ "$TYPE" = "tar archive" ]; then
  if ! is_http_url "$URL"; then
    echo "Cannot download $URL as an archive." >&2
    echo "Only http(s) archive URLs are supported." >&2
    exit 1
  fi
  echo "Downloading $URL..."
  cd "$SRC_DIR" && curl -fsSL -O "$URL"

  DOWNLOADED_FILE=( "$SRC_DIR"/* )
  [[ -e $DOWNLOADED_FILE ]] && echo "Downloaded to $DOWNLOADED_FILE" || { echo "Matched no files" >&2; exit 1; }

  FILENAME="${DOWNLOADED_FILE##*/}"
  EXTENSION="${FILENAME##*.}"
  OPTIONS="-C /app $OPTIONS"
  if [ "$EXTENSION" = "gz" ]; then
    tar -xvzf "$DOWNLOADED_FILE" $OPTIONS
  elif [ "$EXTENSION" = "bz2" ]; then
    tar -xvjf "$DOWNLOADED_FILE" $OPTIONS
  elif [ "$EXTENSION" = "xz" ]; then
    tar -xvJf "$DOWNLOADED_FILE" $OPTIONS
  elif [ "$EXTENSION" = "zip" ]; then
    unzip -o "$DOWNLOADED_FILE" -d /app
  fi

  echo "Extracted $DOWNLOADED_FILE to /app"
fi
