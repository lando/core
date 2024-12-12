#!/bin/sh
set -e

touch /tmp/i-ran

/docker-entrypoint.sh nginx -g "daemon off;"
