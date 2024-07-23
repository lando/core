# Long Name Example

This example exists primarily to test the following documentation:

* [Issue #3179](https://github.com/lando/lando/issues/3179)

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
# Should be able to access http
lando ssh -s defaults -c "curl http://localhost:80" | grep ROOTDIR
lando ssh -s l337 -c "curl http://localhost:80" | grep ROOTDIR
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
