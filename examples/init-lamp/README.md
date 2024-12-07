# LAMP Init Example

This example exists primarily to test the following documentation:

* [lando init](https://docs.lando.dev/cli/init.html)

## Start up tests

Run the following commands to get up and running with this example

```bash
# Should poweroff
lando poweroff
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should initialize the latest codeignitor codebase
rm -rf lamp && mkdir -p lamp && cd lamp
lando init --source remote --remote-url https://github.com/bcit-ci/CodeIgniter/archive/3.1.13.tar.gz --remote-options="--strip-components 1" --recipe lamp --webroot . --name lando-lamp --option composer_version=1.10.1

# Should start up successfully
cd lamp
lando start
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
cd lamp
lando destroy -y
lando poweroff
```
