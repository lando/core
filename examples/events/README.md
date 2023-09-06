Events Example
==============

This example exists primarily to test the following documentation:

* [Events](http://docs.devwithlando.io/config/events.html)
* [Lando 4 l337 service](https://docs.lando.dev/core/v4/landofile/services.html#l-337-service)

See the [Landofiles](http://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

Start up tests
--------------

```bash
# Should start successfully
rm -rf test
lando start
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# Should run events on the appserver container by default
lando ssh -s appserver -c "cat /app/test/appserver-pre-start.txt | grep \$(hostname -s)"

# Should run events on the specified service
lando ssh -s web -c "cat /app/test/web-pre-start.txt | grep \$(hostname -s)"
lando ssh -s web -c "cat /app/test/web-post-start.txt | grep \$(hostname -s)"
lando ssh -s l337 -c "cat /app/test/l337-pre-start.txt | grep \$(hostname -s)"
lando ssh -s l337 -c "cat /app/test/l337-post-start.txt | grep \$(hostname -s)"

# Should run tooling command events using the tooling command service as the default
lando thing
lando ssh -s web -c "cat /app/test/web-post-thing.txt | grep \$(hostname -s)"
lando stuff
lando ssh -s l337 -c "cat /app/test/l337-post-stuff.txt | grep \$(hostname -s)"

# Should run dynamic tooling command events using argv if set or option default otherwise
lando dynamic
lando dynamic --host l337
lando what-service | grep l337 | wc -l | grep 2
lando what-service --service web | grep web | wc -l | grep 2

# Should use the app default service as the default in multi-service tooling
lando multi-pass

# Should run on rebuild without failing and trigger pre-rebuild event
lando rebuild -y | grep "ET TU, BRUT"
lando ssh -s web -c "cat /app/test/web-pre-rebuild.txt | grep rebuilding"
lando ssh -s l337 -c "cat /app/test/l337-pre-rebuild.txt | grep rebuilding"
```

Destroy tests
-------------

```bash
# Should destroy successfully
lando destroy -y
lando poweroff

# Should trigger pre-destroy event
stat test/destroy.txt
stat test/destroy-l337.txt
```
