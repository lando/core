# List Example

This example exists primarily to test the following documentation:

* [`lando list`](https://docs.lando.dev/cli/list.html)

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
# Should list this apps containers
lando list | grep landobase_log_1
lando list | grep landobase_web_1
lando list | grep landobase_web2_1
lando list | grep landobase_web3_1

# Should output JSON in lando list without error
lando list --format json

# Should return a specified path when given with lando list
lando list --path "landobase" | grep landobase
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
