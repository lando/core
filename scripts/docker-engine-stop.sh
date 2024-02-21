#!/bin/sh
set -e

sudo systemctl stop docker.service || sudo service docker stop
