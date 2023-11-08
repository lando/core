#!/bin/bash
set -eo pipefail
# @TODO: throw error if not run as root?

DMG="${1:-Docker.dmg}"
USER="${2:-$(whoami)}"

hdiutil attach "$DMG"
/Volumes/Docker/Docker.app/Contents/MacOS/install --user="$USER"
hdiutil detach /Volumes/Docker
