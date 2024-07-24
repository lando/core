# Host Example

This example exists primarily to test the following documentation:

* [Networking](https://docs.lando.dev/core/v3/networking.html)

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
# Should have the correct envvars set
lando exec pinger -- env | grep LANDO_HOST_IP | grep host.lando.internal
lando exec pinger2 -- env | grep LANDO_HOST_IP | grep host.lando.internal
lando exec pinger3 -- env | grep LANDO_HOST_IP | grep host.lando.internal

# Should be able to ping the host at host.lando.internal
lando exec pinger -- ping host.lando.internal -c 3
lando exec pinger2 -- ping host.lando.internal -c 3
lando exec pinger3 -- ping host.lando.internal -c 3
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
