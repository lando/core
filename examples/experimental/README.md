# Experimetnal Example

This example exists primarily to test the following documentation:

* [Experimental](https://docs.lando.dev/core/v3/experimental.html)

## Start up tests

```bash
# Should start successfully
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should toggle on experimental features
lando --experimental
lando config --path experimental | grep true

# Should be able to restart with experimental plugin loaded
lando config --path experimentalPluginLoadTest | grep true
lando restart

# Should be able to toggle off experimental features
lando --experimental
lando config --path experimental | grep false
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
