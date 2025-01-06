# Events Example

This example exists primarily to test the following documentation:

* [Events](https://docs.devwithlando.io/config/events.html)

See the [Landofiles](https://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
rm -rf test
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should run events on the primary service by default
lando exec appserver -- "cat /app/test/appserver-pre-start.txt | grep \$(hostname -s)"

# Should run events on the specified service
lando exec web -- "cat /app/test/web-pre-start.txt | grep \$(hostname -s)"
lando exec web -- "cat /app/test/web-post-start.txt | grep \$(hostname -s)"
lando exec l337 -- "cat /app/test/l337-pre-start.txt | grep \$(hostname -s)"
lando exec l337 -- "cat /app/test/l337-post-start.txt | grep \$(hostname -s)"
lando exec web2 -- "cat /app/test/web2-pre-start.txt | grep \$(hostname -s)"
lando exec web2 -- "cat /app/test/web2-post-start.txt | grep \$(hostname -s)"

# Should run tooling command events using the tooling command service as the default
lando thing
lando exec web -- "cat /app/test/web-post-thing.txt | grep \$(hostname -s)"
lando exec web2 -- "cat /app/test/web2-post-thing.txt | grep \$(hostname -s)"
lando stuff
lando exec l337 -- "cat /app/test/l337-post-stuff.txt | grep \$(hostname -s)"
lando exec web2 -- "cat /app/test/web2-post-stuff.txt | grep \$(hostname -s)"

# Should run dynamic tooling command events using argv if set or option default otherwise
lando dynamic
lando dynamic --host l337
lando what-service | grep l337 | wc -l | grep 2
lando what-service --service web | grep web | wc -l | grep 3 # TODO(flo): Whyever web is printed out here again...
lando what-service --service web2 | grep web | wc -l | grep 2

# Should use the app default service as the default in multi-service tooling
lando multi-pass

# Should run on rebuild without failing and trigger pre-rebuild event
lando rebuild -y | grep "ET TU, BRUT"
lando exec web -- cat /app/test/web-pre-rebuild.txt | grep rebuilding
lando exec l337 -- cat /app/test/l337-pre-rebuild.txt | grep rebuilding
lando exec web2 -- cat /app/test/web2-pre-rebuild.txt | grep rebuilding

# Should run events as the correct user
lando exec appserver -- cat /app/test/appserver-user.txt | grep www-data
lando exec web -- cat /app/test/web-user.txt | grep www-data
lando exec l337 -- cat /app/test/l337-user.txt | grep root
lando exec web2 -- cat /app/test/web2-user.txt | grep nginx

# Should load the correct environment for lando 4 service events
lando env
lando exec web2 -- cat /app/test/web2-event-env.txt | grep LANDO_ENVIRONMENT | grep loaded
lando exec web2 -- cat /app/test/web2-tooling-event-env.txt | grep LANDO_ENVIRONMENT | grep loaded

# Should be able to background events with line ending ampersands
lando backgrounder
lando exec appserver -- ps a | grep "tail -f /dev/null"
lando exec --user root alpine -- ps a | grep "sleep infinity"
lando exec l337 -- ps -e -o cmd | grep "sleep infinity"
lando exec web2 -- ps -e -o cmd | grep "sleep infinity"
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff

# Should trigger pre-destroy event
stat test/destroy.txt
stat test/destroy-l337.txt
stat test/destroy-web2.txt
```
