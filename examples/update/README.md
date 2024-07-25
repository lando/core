# Update Test

This example exists primarily to test the following documentation:

* [update](https://docs.lando.dev/cli/update.html)

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should be able to add a legacy plugin version.
lando config | grep -qv "plugins/@lando/php"
lando plugin-add "@lando/php@v0.9.0"
lando version -c "@lando/php" | grep -q "v0.9.0"

# Should be able to run lando update and update legacy plugin.
lando update -y
lando version -c "@lando/php" | grep -qv "v0.9.0"

# Should be able to run lando update with a bogus GITHUB_TOKEN
GITHUB_TOKEN="BROKEN TOKEN" lando update -y
```
