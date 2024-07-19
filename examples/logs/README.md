# Logs Example

This example exists primarily to test the following documentation:

* [`lando logs`](https://docs.lando.dev/cli/logs.html)

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
# Should return logs without error
lando logs

# Should return only logs for the specified service
lando logs -s web2 | grep log_1 || echo $? | grep 1
lando logs --service web2 | grep log_1 || echo $? | grep 1
lando logs -s web3 | grep log_1 || echo $? | grep 1
lando logs --service web3 | grep log_1 || echo $? | grep 1
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
