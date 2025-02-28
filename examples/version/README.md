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
# Should run version without error in app context
lando version

# Should run version without error in global context
cd ..
lando version

# Should return the lando core version by default
lando version | grep "$(lando version --component core)"

# Should print all version information with --all
lando version --all
lando version --all | grep lando | grep "$(lando version --component @lando/core)"
lando version --all | grep @lando/base-test-plugin-2 | grep v1.0.2
lando version -a | grep lando | grep v3

# Should print specific component information
lando version --component @lando/base-test-plugin-2 | grep v1.0.2
lando version --plugin base-test-plugin-2 | grep v1.0.2

# Should print full version information
lando version --full
lando version --full | grep "$(lando version -c core)" | grep "$(lando config --path os.platform | tr -d '\n' | sed -e "s/^'//" -e "s/'$//")" | grep "$(lando config --path os.arch | tr -d '\n' | sed -e "s/^'//" -e "s/'$//")" | grep node-v20
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
