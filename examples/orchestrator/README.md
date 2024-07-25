# Orchestrator Example

This example exists primarily to test the following documentation:

* [Orchestrator](https://docs.lando.dev/core/v3/orchestrator.html)

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should install and use the version of docker compose that is in the config by default
lando setup -y --skip-common-plugins
lando start
"$HOME/.lando/bin/docker-compose-v$(lando config --path orchestratorVersion --format json | tr -d '"')" --version
lando start -vvv 2>&1 | grep ".lando/bin/docker-compose-v$(lando config --path orchestratorVersion --format json | tr -d '"')"

# Should install a custom version if specified
lando setup -y --skip-common-plugins --orchestrator="2.19.1"
LANDO_ORCHESTRATOR_VERSION="2.19.1" lando config --path orchestratorVersion --format json | tr -d '"' | grep "2.19.1"
LANDO_ORCHESTRATOR_VERSION="2.19.1" lando start
LANDO_ORCHESTRATOR_VERSION="2.19.1" lando start -vvv 2>&1 | grep ".lando/bin/docker-compose-v2.19.1"

# Should use a system fallback or automatically download the default compose when version is bogus
LANDO_ORCHESTRATOR_VERSION="UHNO" lando start -vvv 2>&1 | grep -E "/usr/local/bin/docker-compose|.lando/bin/docker-compose"

# Should use the orchestratorBin if set
LANDO_ORCHESTRATOR_BIN="/usr/local/bin/docker-compose" lando config --path orchestratorBin | grep "$LANDO_ORCHESTRATOR_BIN"
LANDO_ORCHESTRATOR_BIN="/usr/local/bin/docker-compose" lando start -vvv 2>&1 | grep "$LANDO_ORCHESTRATOR_BIN"

# Should set orchestratorBin with composeBin if orchestratorBin is not set
LANDO_COMPOSE_BIN="/usr/local/bin/docker-compose" lando config --path orchestratorBin | grep "$LANDO_COMPOSE_BIN"

# Should prefer orchestratorBin to composeBin
LANDO_COMPOSE_BIN="/usr/local/bin/bogus" LANDO_ORCHESTRATOR_BIN="/usr/local/bin/docker-compose" lando config --path orchestratorBin | grep "$LANDO_ORCHESTRATOR_BIN"
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
