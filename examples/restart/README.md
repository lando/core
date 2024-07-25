# Restart Example

This example exists primarily to test the following documentation:

* [`lando start`](https://docs.lando.dev/cli/start.html)
* [`lando stop`](https://docs.lando.dev/cli/stop.html)
* [`lando restart`](https://docs.lando.dev/cli/restart.html)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should stop the apps containers
lando stop
docker ps --filter label=com.docker.compose.project=landorestart -q | wc -l | grep 0

# Should stop ALL running lando containers
lando start
docker ps --filter label=io.lando.container=TRUE -q | wc -l | grep 4
lando poweroff
docker ps --filter label=io.lando.container=TRUE -q | wc -l | grep 0

# Should restart the services without errors
lando restart
docker ps --filter label=com.docker.compose.project=landorestart | grep landorestart_web_1
docker ps --filter label=com.docker.compose.project=landorestart | grep landorestart_web2_1
docker ps --filter label=com.docker.compose.project=landorestart | grep landorestart_web3_1
docker ps --filter label=com.docker.compose.project=landorestart | grep landorestart_web4_1
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
