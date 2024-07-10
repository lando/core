#!/bin/bash

source /etc/lando/environment

# Execute sh scripts in /etc/lando/boot.d
for script in /etc/lando/lash.d/*.sh; do
  if [ -e "$script" ]; then
    if [ -r "$script" ] && [ -f "$script" ]; then
      source "$script"
    fi
  fi
done
