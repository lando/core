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
# Should have health status set to unknown by default
lando destroy -y
lando info -s appserver | grep healthy: | grep unknown
lando info -s nginx | grep healthy: | grep unknown
lando info -s nginx2 | grep healthy: | grep unknown
lando info -s database1 | grep healthy: | grep unknown
lando info -s database2 | grep healthy: | grep unknown
lando info -s disablebase | grep healthy: | grep unknown

# Should run healthchecks sucessfully
lando start

# Should have passed all the healthchecks
lando ssh -s appserver -c "stat /healthy"
lando ssh -s database1 -c "mysql -uroot --silent --execute \"SHOW DATABASES;\""
lando ssh -s database2 -c "mysql -uroot --silent --execute \"SHOW DATABASES;\""

# Should set healthy status to true if applicable
lando info -s appserver | grep healthy: | grep true
lando info -s nginx | grep healthy: | grep unknown
lando info -s nginx2 | grep healthy: | grep true
lando info -s database1 | grep healthy: | grep true
lando info -s database2 | grep healthy: | grep true
lando info -s disablebase | grep healthy: | grep unknown
```

Destroy tests
-------------

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
