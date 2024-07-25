#!/bin/sh
set -e

systemctl stop docker.service || service docker stop
