# Recipes Example

This example exists primarily to test the following documentation:

* [Recipes](https://docs.lando.dev/config/recipes.html)

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
# Should load in correct recipe services
lando info --service web --path service | grep web
lando info --service web2 --path service | grep web2

# Should load in correct recipe tasks
lando recipe | grep "I WORKED\!"

# Should load in correct recipe tooling
lando env | grep LANDO_SERVICE_NAME | grep web

# Should persist recipe tooling cache between rebuilds
lando do-i-exist | grep icachethereforeiam
lando rebuild -y
lando do-i-exist | grep icachethereforeiam

# Should add recipe services
skip

# Should add recipe init
skip

# Should add recipe source
skip
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
