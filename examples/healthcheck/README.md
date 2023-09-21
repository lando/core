Healthcheck Example
===================

This example exists primarily to test the following documentation:

* [Healthcheck](https://docs.lando.dev/core/v3/healthcheck.html)

Start up tests
--------------

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

Verification commands
---------------------

Run the following commands to validate things are rolling as they should.

```bash
# Should have passed the healthcheck and created the healthfile
lando ssh -s appserver -c "cat /healthfile" | grep -w XXXXX
```

Destroy tests
-------------

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
