# CLI Debug Example

This example exists primarily to test the following documentation:

* [CLI Options](https://docs.lando.dev/cli/)

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
# Should run debug messages on stderr
lando info -v | grep INFO || echo $? | grep 1
lando info -vv | grep VERBOSE || echo $? | grep 1
lando info -vvv | grep DEBUG || echo $? | grep 1
lando info -vvvv | grep SILLY || echo $? | grep 1

# Should run all log levels on stderr
lando info -v 2>&1 | grep lando | grep + | grep ms
lando info -vv 2>&1 | grep lando | grep + | grep ms
lando info -vvv 2>&1 | grep lando | grep + | grep ms
lando info -vvvv 2>&1 | grep lando | grep + | grep ms
lando info --debug 2>&1 | grep lando | grep + | grep ms
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
