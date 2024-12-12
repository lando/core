# YAML Example

This example exists primarily to test the following documentation:

* [Lando 4 Command](TBD)

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
# Should load/import correctly based on file extension
lando exec auto -- stat /tmp/i-ran
lando exec auto -- env | grep VIBE | grep rising
lando exec auto -- env | grep CAPTAIN | grep kirk

# Should load/import based on @type if provided
lando exec manual -- stat /tmp/i-ran
lando exec manual -- env | grep VIBE | grep rising
lando exec manual -- env | grep CAPTAIN | grep kirk
docker inspect landoyaml_manual_1 | grep binary-data | grep "$(base64 -i env.huh)"
docker inspect landoyaml_manual_1 | grep something-data | grep "something"
```

## Destroy tests

```bash
# Should destroy and poweroff
lando destroy -y
lando poweroff
```
