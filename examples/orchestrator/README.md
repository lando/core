Orchestrator Example
====================

This example exists primarily to test the following documentation:

* [Orchestrator](https://docs.lando.dev/core/v3/orchestrator.html)

Start up tests
--------------

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

Verification commands
---------------------

Run the following commands to validate things are rolling as they should.

```bash
# Should install and use the version of docker compose that is in the config by default
lando start
"$HOME/.lando/bin/docker-compose-v$(lando config --path orchestratorVersion --format json | tr -d '"')" --version
lando start -vvv 2>&1 | grep ".lando/bin/docker-compose-v$(lando config --path orchestratorVersion --format json | tr -d '"')"

# Should install a custom version if specified
LANDO_ORCHESTRATOR_VERSION="1.29.2" lando config --path orchestratorVersion --format json | tr -d '"' | grep "1.29.2"
LANDO_ORCHESTRATOR_VERSION="1.29.2" lando start
LANDO_ORCHESTRATOR_VERSION="1.29.2" lando start -vvv 2>&1 | grep ".lando/bin/docker-compose-v1.29.2"

# Should use a system fallback if avialable if version is bogus
LANDO_ORCHESTRATOR_VERSION="UHNO" lando start -vvv 2>&1 | grep "/usr/local/bin/docker-compose"

# Should use the orchestratorBin if set
LANDO_ORCHESTRATOR_BIN="/usr/local/bin/docker-compose" lando config --path orchestratorBin | grep "$LANDO_ORCHESTRATOR_BIN"
LANDO_ORCHESTRATOR_BIN="/usr/local/bin/docker-compose" lando start -vvv 2>&1 | grep "$LANDO_ORCHESTRATOR_BIN"

# Should set orchestratorBin with composeBin if orchestratorBin is not set
LANDO_COMPOSE_BIN="/usr/local/bin/docker-compose" lando config --path orchestratorBin | grep "$LANDO_COMPOSE_BIN"

# Shoud prefer orchestratorBin to composeBin
LANDO_COMPOSE_BIN="/usr/local/bin/bogus" LANDO_ORCHESTRATOR_BIN="/usr/local/bin/docker-compose" lando config --path orchestratorBin | grep "$LANDO_ORCHESTRATOR_BIN"
```

Destroy tests
-------------

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
