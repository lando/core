# Recipes Example

This example exists primarily to test the following documentation:

* [Recipes](https://docs.lando.dev/config/recipes.html)

See the [Landofiles](http://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should work
true
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
