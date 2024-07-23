# No Services Example

This example exists primarily to test what happens if you Lando start an app with no services.

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should be able to run all the core commands
lando stop
lando destroy -y
lando start
lando rebuild -y
lando restart
lando info
lando list
lando logs
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
