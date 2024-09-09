# Landofile Example

This example exists primarily to test the following documentation:

* [Landofiles](https://docs.lando.dev/config/lando.html)

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
# Should merge in all Landofiles correctly
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-log-1
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-web-1
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-web2-1
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-web3-1

# Should merge in all Landofiles correctly even if we are down a directory
cd docker-compose
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-log-1
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-web-1
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-web2-1
docker ps --filter label=com.docker.compose.project=lando-landofile | grep lando-landofile-web3-1
cd ..
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
