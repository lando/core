# Info Example

This example exists primarily to test the following documentation:

* [`lando info`](https://docs.lando.dev/cli/info.html)

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
# Should run lando info without error
lando info

# Should return expanded data with --deep
lando info -d | grep NetworkSettings
lando info --deep | grep NetworkSettings

# Should return filtered data
lando info --filter service=web4 --path api | grep 4
lando info --filter api=4 --filter primary=true --path service | grep web3
lando info --deep --filter Path=/etc/lando/entrypoint.sh --filter Config.User=nginx --path Config.User | grep nginx
lando info --filter api=4 --path "[0].service" | grep web3

# Should output JSON with --format json
lando info --format json | grep "^\[{\""
lando info --deep --format json | grep "^\[{\""

# Should output tabular data with --format table
lando info --format table | grep Key | grep Value
lando info --deep --format table | grep NetworkSettings.Networks.lando_bridge_network.Aliases | grep web4.landoinfo.internal

# Should return a specified --path when given with lando info
lando info --path "[0]" | grep service | wc -l | grep 1
lando info --deep --path "[0].Config.User" | grep nginx

# Should return --path without preceding index if array has size 1
lando info --path service --service web4 | grep web4
lando info --deep --service web4 --path Config.User | grep nginx

# Should return info for --services only
lando info --service web4 | grep service | wc -l | grep 1
lando info --service web4 --service web3 | grep service | wc -l | grep 2
lando info -d --service web4 | grep NetworkSettings: | wc -l | grep 1
lando info -d --service web4 --service web3 | grep NetworkSettings: | wc -l | grep 2

# Should have the correct default info before start or after destroy
lando destroy -y
lando info --service web --path urls | grep "\[\]"
lando info --service web --path type | grep docker-compose
lando info --service web --path healthy | grep unknown
lando info --service web --path hostnames | grep web.landoinfo.internal
lando info --service web2 --path urls | grep "\[\]"
lando info --service web2 --path type | grep lando
lando info --service web2 --path healthy | grep unknown
lando info --service web2 --path version | grep custom
lando info --service web2 --path meUser | grep www-data
lando info --service web2 --path hasCerts | grep "false"
lando info --service web2 --path api | grep 3
lando info --service web2 --path hostnames | grep web2.landoinfo.internal
lando info --service web3 --path urls | grep "\[\]"
lando info --service web3 --path type | grep l337
lando info --service web3 --path healthy | grep unknown
lando info --service web3 --path api | grep 4
lando info --service web3 --path state.IMAGE | grep UNBUILT
lando info --service web3 --path primary | grep "true"
lando info --service web3 --path image | grep nginx
lando info --service web3 --path user | grep root
lando info --service web3 --path appMount | grep /usr/share/nginx/html
lando info --service web3 --path hostnames | grep web3.landoinfo.internal
lando info --service web4 --path urls | grep "\[\]"
lando info --service web4 --path type | grep lando
lando info --service web4 --path healthy | grep unknown
lando info --service web4 --path api | grep 4
lando info --service web4 --path state.IMAGE | grep UNBUILT
lando info --service web4 --path state.APP | grep UNBUILT
lando info --service web4 --path primary | grep "false"
lando info --service web4 --path image | grep nginxinc/nginx-unprivileged:1.26.1
lando info --service web4 --path user | grep nginx
lando info --service web4 --path appMount | grep /usr/share/nginx/html
lando info --service web4 --path hostnames | grep web4.landoinfo.internal

# Should have the correct info after a start and/or rebuild
lando start
lando info --service web --path urls | grep "\[\]"
lando info --service web --path type | grep docker-compose
lando info --service web --path healthy | grep unknown
lando info --service web --path hostnames | grep web.landoinfo.internal
lando info --service web2 --path urls | grep "http://localhost"
lando info --service web2 --path type | grep lando
lando info --service web2 --path healthy | grep unknown
lando info --service web2 --path version | grep custom
lando info --service web2 --path meUser | grep www-data
lando info --service web2 --path hasCerts | grep "false"
lando info --service web2 --path api | grep 3
lando info --service web2 --path hostnames | grep web2.landoinfo.internal
lando info --service web3 --path urls | grep "http://localhost"
lando info --service web3 --path type | grep l337
lando info --service web3 --path healthy | grep unknown
lando info --service web3 --path api | grep 4
lando info --service web3 --path state.IMAGE | grep BUILT
lando info --service web3 --path tag | grep "lando/lando-info-.*-web3:latest"
lando info --service web3 --path primary | grep "true"
lando info --service web3 --path image | grep nginx
lando info --service web3 --path user | grep root
lando info --service web3 --path appMount | grep /usr/share/nginx/html
lando info --service web3 --path hostnames | grep web3.landoinfo.internal
lando info --service web4 --path urls | grep "http://localhost"
lando info --service web4 --path type | grep lando
lando info --service web4 --path healthy | grep unknown
lando info --service web4 --path api | grep 4
lando info --service web4 --path state.IMAGE | grep BUILT
lando info --service web4 --path state.APP | grep BUILT
lando info --service web4 --path tag | grep "lando/lando-info-.*-web4:latest"
lando info --service web4 --path primary | grep "false"
lando info --service web4 --path image | grep nginxinc/nginx-unprivileged:1.26.1
lando info --service web4 --path user | grep nginx
lando info --service web4 --path appMount | grep /usr/share/nginx/html
lando info --service web4 --path hostnames | grep web4.landoinfo.internal
lando rebuild -y
lando info --service web --path urls | grep "\[\]"
lando info --service web --path type | grep docker-compose
lando info --service web --path healthy | grep unknown
lando info --service web --path hostnames | grep web.landoinfo.internal
lando info --service web2 --path urls | grep "http://localhost"
lando info --service web2 --path type | grep lando
lando info --service web2 --path healthy | grep unknown
lando info --service web2 --path version | grep custom
lando info --service web2 --path meUser | grep www-data
lando info --service web2 --path hasCerts | grep "false"
lando info --service web2 --path api | grep 3
lando info --service web2 --path hostnames | grep web2.landoinfo.internal
lando info --service web3 --path urls | grep "http://localhost"
lando info --service web3 --path type | grep l337
lando info --service web3 --path healthy | grep unknown
lando info --service web3 --path api | grep 4
lando info --service web3 --path state.IMAGE | grep BUILT
lando info --service web3 --path tag | grep "lando/lando-info-.*-web3:latest"
lando info --service web3 --path primary | grep "true"
lando info --service web3 --path image | grep nginx
lando info --service web3 --path user | grep root
lando info --service web3 --path appMount | grep /usr/share/nginx/html
lando info --service web3 --path hostnames | grep web3.landoinfo.internal
lando info --service web4 --path urls | grep "http://localhost"
lando info --service web4 --path type | grep lando
lando info --service web4 --path healthy | grep unknown
lando info --service web4 --path api | grep 4
lando info --service web4 --path state.IMAGE | grep BUILT
lando info --service web4 --path state.APP | grep BUILT
lando info --service web4 --path tag | grep "lando/lando-info-.*-web4:latest"
lando info --service web4 --path primary | grep "false"
lando info --service web4 --path image | grep nginxinc/nginx-unprivileged:1.26.1
lando info --service web4 --path user | grep nginx
lando info --service web4 --path appMount | grep /usr/share/nginx/html
lando info --service web4 --path hostnames | grep web4.landoinfo.internal
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
