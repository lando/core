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

# Should return docker inspect data
lando info -d | grep NetworkSettings
lando info --deep | grep NetworkSettings

# Should output JSON in lando info without error
lando info --format json

# Should return a specified path when given with lando info
lando info --path "[0]" | grep service | wc -l | grep 1

# Should have the correct info after destroy
lando destroy -y
fail
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
