#!/bin/sh
set -e

systemctl start docker.service || service docker start
