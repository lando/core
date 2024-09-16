# Mounts Example

This example exists primarily to test the following documentation:

* [Lando 4 Service Mounts](TBD)

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
# Should test something
skip
```

## Destroy tests

```bash
# Should destroy and poweroff
lando destroy -y
lando poweroff
```
