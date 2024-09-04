# Rebuild Example

This example exists primarily to test the following documentation:

* [`lando rebuild`](https://docs.lando.dev/cli/rebuild.html)

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
# Should rebuild the services without errors
lando rebuild -y
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web2_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web3_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web4_1

# Should only rebuild the specified services
lando rebuild -y --service web2
lando rebuild -y -s web2
docker ps --latest | grep landorebuild_web2_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web2_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web3_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web4_1
lando rebuild -y --service web3
lando rebuild -y -s web3
docker ps --latest | grep landorebuild_web3_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web2_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web3_1
docker ps --filter label=com.docker.compose.project=landorebuild | grep landorebuild_web4_1

# Should persist tooling cache between rebuilds
lando do-i-exist | grep icachethereforeiam
lando rebuild -y
lando do-i-exist | grep icachethereforeiam
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
