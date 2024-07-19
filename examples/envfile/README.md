# Envfile Example

This example exists primarily to test the following documentation:

* [Environment Files](https://docs.lando.dev/config/env.html#environment-files)

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
# Should load environment files from all Landofiles in the correct order
lando exec web -- env | grep "MILEY=CYRUS"
lando exec web -- env | grep "TAYLOR=SWIFT"
lando exec web -- env| grep "LOCAL=LANDO"
lando exec web -- env| grep "COUNT=1"
lando exec web2 -- env | grep "MILEY=CYRUS"
lando exec web2 -- env | grep "TAYLOR=SWIFT"
lando exec web2 -- env| grep "LOCAL=LANDO"
lando exec web2 -- env| grep "COUNT=1"
lando exec web3 -- env | grep "MILEY=CYRUS"
lando exec web3 -- env | grep "TAYLOR=SWIFT"
lando exec web3 -- env| grep "LOCAL=LANDO"
lando exec web3 -- env| grep "COUNT=1"
lando exec web4 -- env | grep "MILEY=CYRUS"
lando exec web4 -- env | grep "TAYLOR=SWIFT"
lando exec web4 -- env| grep "LOCAL=LANDO"
lando exec web4 -- env| grep "COUNT=1"

# Should load environment files from all Landofiles if we are down a directory
cd environment
lando exec web -- env | grep "MILEY=CYRUS"
lando exec web -- env | grep "TAYLOR=SWIFT"
lando exec web -- env| grep "LOCAL=LANDO"
lando exec web -- env| grep "COUNT=1"
lando exec web2 -- env | grep "MILEY=CYRUS"
lando exec web2 -- env | grep "TAYLOR=SWIFT"
lando exec web2 -- env| grep "LOCAL=LANDO"
lando exec web2 -- env| grep "COUNT=1"
lando exec web3 -- env | grep "MILEY=CYRUS"
lando exec web3 -- env | grep "TAYLOR=SWIFT"
lando exec web3 -- env| grep "LOCAL=LANDO"
lando exec web3 -- env| grep "COUNT=1"
lando exec web4 -- env | grep "MILEY=CYRUS"
lando exec web4 -- env | grep "TAYLOR=SWIFT"
lando exec web4 -- env| grep "LOCAL=LANDO"
lando exec web4 -- env| grep "COUNT=1"
cd ..
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
