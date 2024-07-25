# Scanner Example

This example exists primarily to test the following documentation:

* [Scanning](https://docs.lando.dev/core/v3/scanner.html)

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
# Should set 80,443 in io.lando.http-ports label by default
docker inspect landoscanner_scanme_1 | grep io.lando.http-ports | grep "80,443"

# Should add an extra port to io.lando.http-ports if specified
docker inspect landoscanner_moreports_1 | grep io.lando.http-ports | grep "80,443,8888"
docker inspect landoscanner_l337_1 | grep dev.lando.http-ports | grep "8888"

# Should set correct labels in Lando 4 services
docker inspect landoscanner_web4_1 | grep io.lando.http-ports | grep "80,443"
docker inspect landoscanner_web4_1 | grep dev.lando.http-ports | grep "8080"
docker inspect landoscanner_web4_1 | grep dev.lando.https-ports | grep "8443"
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
