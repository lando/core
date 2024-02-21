#!/bin/sh
set -e

sudo systemctl start docker.service || sudo service docker start
