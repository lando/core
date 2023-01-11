Long Name Example
=================

This example exists primarily to test the following documentation:

* [Issue #3179](https://github.com/lando/lando/issues/3179)

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
# Should be able to access http
lando ssh -s defaults -c "curl http://localhost:80" | grep ROOTDIR

# Should be able to access https
lando ssh -s defaults -c "curl https://localhost:443" | grep ROOTDIR

# Should have a valid cert in the right place
lando ssh -s defaults -c "openssl x509 -in /certs/cert.crt -text -noout"  | grep CN | grep "landothesitenamethatneverendsitgoesonandonmyfriendsnoseriousl..."
```

Destroy tests
-------------

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
