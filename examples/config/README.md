# Config Example

This example exists primarily to test the following documentation:

* [`lando config`](https://docs.lando.dev/cli/config.html)

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
# Should run lando config without error in app context
lando config

# Should run lando config without error in global context
cd ..
lando config

# Should return lando help
lando config --help | grep "lando config --format table --path env"
lando config --lando | grep "lando config --format table --path env"

# Should only show specified path in lando config
lando config --path mode | grep cli
lando config -p mode | grep cli
lando config --field mode | grep cli
lando config --field mode | grep recipes || echo $? | grep 1

# Should output in json format
lando config --format json | grep "^{\""

# Should output in table format
lando config --format table | grep landoFileConfig.name | grep lando-config

# Should be able to mount config files in a few different ways
lando exec web2 -- cat /tmp/rooster | grep "here they come to snuff the rooster"
lando exec web2 -- cat /tmp/somewhere | grep "here they come to snuff the rooster"
lando exec web2 -- cat /tmp/somewhere-else | grep "here they come to snuff the rooster"
lando exec web2 -- cat /tmp/somewhere-else-else | grep "here they come to snuff the rooster"
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
