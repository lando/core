---
title: Orchestrator
description: How to configure the Lando 3 orchestrator eg Docker Compose
---

# Orchestrator

Lando uses [Docker Compose](https://docs.docker.com/compose/) as its primary (and only) service orchestrator.

By default Lando will use version `2` of the Docker Compose CLI however you can modify the version or specify the path to a locally installed version in the [global config](global.md).

## Version

If you would like to use a specific version of the Docker Compose CLI you can set `orchestratorVersion` in the [global config](global.md).

::: warning YMMV
Note that we have not tested every version combination so if you change the version from the default your mileage my vary.
:::

**config.yml**

```yaml
# valid vibes
orchestratorVersion: "1.29.2"
orchestratorVersion: "2.21.0"

# unvalid vibes
orchestratorVersion: "1"
orchestratorVersion: "2.x"
orchestratorVersion: "latest"
```

AKA use the three point version of a release that exists over [here](https://github.com/docker/compose/releases) but without the preceding `v`.

Alternatively you can set the environment variable `LANDO_ORCHESTRATOR_VERSION`.

```bash:no-line-numbers
# start my app with the default orchestrator version
lando start

# unwisely try to rebuild using a new and lando-unsupported version of docker compose
LANDO_ORCHESTRATOR_VERSION="2.22.0" lando rebuild -y

# feel nostalgic for the past and rebuild on docker compose 1
LANDO_ORCHESTRATOR_VERSION="1.29.2" lando rebuild -y

# drop too much acid and think we are in the future
#
# @NOTE: this fallsback to using a system-installed version of docker compose
#        if it exists
LANDO_ORCHESTRATOR_VERSION="3.14.17" lando rebuild -y
```

## Path

You can also tell Lando to use a locally installed version of Docker Compose. This must be an absolute path that exists.

```yaml
orchestratorBin: /usr/local/bin/docker-compose-2
```

Note that `orchestratorBin` will automatically be set using the `DEPRECATED` `composeBin` key if it exists and `orchestratorBin` does not.

Alternatively you can set the environment variable `LANDO_ORCHESTRATOR_BIN`.

```bash:no-line-numbers
LANDO_ORCHESTRATOR_BIN="/usr/local/bin/fail-me" lando rebuild -y
```

## Resolution

You may be wondering how Lando will decide what version to use if you've passed in multiple things. Here is how version resolution happens:

1. Lando will use `orchestratorBin` if it is set to an absolute path that exists.
2. Otherwise Lando will use `orchestratorVersion` if it is a valid version and can be downloaded.
3. Otherwise Lando will use a system-installed version of Docker Compose if it exists
4. Otherwise Lando will throw an error :frowning: :computer: :exclamation:
