# Sluggy Example

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should correctly match up sluggy names
lando do-i-exist | grep icachethereforeiam

# Should be destroyed with success
lando destroy -y

# Should be renamed to landoSluggy
echo "name: landoSluggy" > .lando.local.yml

# Should start up successfully
lando start

# Should correctly match up sluggy names
lando do-i-exist | grep icachethereforeiam
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
