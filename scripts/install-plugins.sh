#!/bin/bash
set -eo pipefail

DEBUG="${RUNNER_DEBUG:-0}"
LANDO="lando"
LANOD_DEBUG=""
TAG=latest

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --debug)
      DEBUG=1
      shift
    ;;
    --edge)
      TAG=edge
      shift
    ;;
    --lando)
      LANDO="$2"
      shift 2
    ;;
    --lando=*)
      LANDO="${1#*=}"
      shift
    ;;
    --)
      shift
      break
    ;;
    -*|--*=)
      shift
    ;;
    *)
      shift
    ;;
  esac
done

# debug
debug "running script with:"
debug "DEBUG: $DEBUG"
debug "LANDO: $LANDO"
debug "TAG: $TAG"

if [[ "$DEBUG" == 1 ]]; then
  LANDO_DEBUG="--debug"
fi

# install common plugins
"$LANDO" plugin-add \
  @lando/acquia@$TAG \
  @lando/apache@$TAG \
  @lando/backdrop@$TAG \
  @lando/compose@latest \
  @lando/dotnet@$TAG \
  @lando/drupal@$TAG \
  @lando/elasticsearch@$TAG \
  @lando/go@$TAG \
  @lando/joomla@$TAG \
  @lando/lagoon@$TAG \
  @lando/lamp@$TAG \
  @lando/laravel@$TAG \
  @lando/lemp@$TAG \
  @lando/mailhog@$TAG \
  @lando/mailpit@$TAG \
  @lando/mariadb@$TAG \
  @lando/mean@$TAG \
  @lando/memcached@$TAG \
  @lando/mongo@$TAG \
  @lando/mssql@$TAG \
  @lando/mysql@$TAG \
  @lando/nginx@$TAG \
  @lando/node@$TAG \
  @lando/pantheon@$TAG \
  @lando/php@$TAG \
  @lando/phpmyadmin@$TAG \
  @lando/postgres@$TAG \
  @lando/python@$TAG \
  @lando/redis@$TAG \
  @lando/ruby@$TAG \
  @lando/solr@$TAG \
  @lando/symfony@$TAG \
  @lando/tomcat@$TAG \
  @lando/varnish@$TAG \
  @lando/wordpress@$TAG \
  --dir plugins \
  --fetch-namespace package \
  --remove-dependency axios \
  --remove-dependency js-yaml \
  --remove-dependency lodash \
  --remove-dependency semver \
  $LANDO_DEBUG

# if this is fatcore edge then also update the release channel to edge
if [[ "$TAG" == "edge" ]]; then
  debug "updating config.yml with channel=edge"
  sed -i.bak "s/^channel: stable/channel: edge/" config.yml
  debug "$(cat config.yml)"
  rm -rf config.yml.bak
fi

# add FATCORE init file
touch FATCORE
