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

# Should clear the lando tasks cache
lando version
lando --clear
ls -lsa ~/.lando/cache | grep _.tasks.cache || echo $? | grep 1

# Should set the release channel as stable by default
lando config | grep "channel" | grep "stable"

# Should set the release channel based on the user option
lando --channel edge
lando config | grep "channel" | grep "edge"
lando --channel stable
lando config | grep "channel" | grep "stable"

# Should not allow bogus release channels
lando --channel orange || echo $? | grep 1

# Should load plugins from pluginDirs
lando stuff | grep "I WORKED"

# Should load plugins specified in landofile
lando stuff2 | grep "I WORKED"
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
