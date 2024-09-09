#!/bin/sh

# retry settings
attempt=0
delay=1
retry=32

until [ "$attempt" -ge "$retry" ]
do
  test -f "/tmp/lando-entrypoint-ran" && break
  attempt=$((attempt+1))
  sleep "$delay"
done
