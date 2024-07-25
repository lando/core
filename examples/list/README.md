# List Example

This example exists primarily to test the following documentation:

* [`lando list`](https://docs.lando.dev/cli/list.html)

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
# Should run lando list without error from app context
lando list

# Should run lando list witout error from outside app context
cd ..
lando list

# Should list this apps containers
lando list --app landolist | grep landolist_web_1
lando list --app landolist | grep landolist_web2_1
lando list --app landolist | grep landolist_web3_1
lando list --app landolist | grep landolist_web4_1

# Should list no containers if we spin down the app
lando stop
lando list | grep "\[\]"

# Should list even stopped containers with --all
lando list --all | grep landolist_web_1
lando list --all | grep landolist_web2_1
lando list --all | grep landolist_web3_1
lando list --all | grep landolist_web4_1

# Should output JSON with --format json
lando list --all --format json | grep "^\[{\""

# Should output tabular data with --format table
lando list --all --format table | grep Key | grep Value

# Should return a specified path when given with --path
# lando list --all --path "[0].service" | grep web4
skip

# Should return --path without preceding index if array has size 1
lando start
lando list --filter app=landolist --filter service=web4 --path service | grep web4

# Should allow data to be filtered
docker stop landolist_web4_1
lando list --all --filter running=false --filter app=landolist --path service | grep web4
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
