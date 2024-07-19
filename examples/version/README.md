# Version Example

This example exists primarily to test the following documentation:

* [`lando version`](https://docs.lando.dev/cli/version.html)

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
# Should return the version
lando version | grep "v3."
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
