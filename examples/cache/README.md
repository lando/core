# Cache Example

This example exists primarily to test the task caches

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
# Should have both a global and app task cache after a start
cat ~/.lando/cache/_.tasks.cache
cat ~/.lando/cache/lando-cache.compose.cache

# Should not have either after a lando --clear
lando --clear
cat ~/.lando/cache/_.tasks.cache || echo $? | grep 1
cat ~/.lando/cache/lando-cache.compose.cache || echo $? | grep 1

# Should regenerate the caches on lando
lando --clear
lando || true
cat ~/.lando/cache/_.tasks.cache
cat ~/.lando/cache/lando-cache.compose.cache

# Should regenerate the caches on any --help before the help is displayed
lando --clear
lando exec --help | grep service | grep choices | grep web | grep web2 | grep web3 | grep web4
cat ~/.lando/cache/_.tasks.cache
cat ~/.lando/cache/lando-cache.compose.cache

# Should remove the compose cache after a destroy
lando destroy -y
cat ~/.lando/cache/lando-cache.compose.cache || echo $? | grep 1
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
