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
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_log_1
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_web_1
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_web2_1
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_web3_1

# Should merge in all Landofiles correctly even if we are down a directory
cd docker-compose
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_log_1
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_web_1
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_web2_1
docker ps --filter label=com.docker.compose.project=landolandofile | grep landolandofile_web3_1
cd ..
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
