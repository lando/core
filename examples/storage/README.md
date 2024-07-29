# Storage Example

This example exists primarily to test the following documentation:

* [Lando 4 Service Storage](TBD)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should create a storage volume with app scope by default
skip

# Should create a storage volume with global scope if specified
skip

# Should create host bind mounted storage if specified
# @TODO: relies on TBD MOUNTING system
skip

# Should remove app scope storage volumes on destroy
skip
```

## Destroy tests

```bash
# Should destroy and poweroff
lando destroy -y
lando poweroff
```
