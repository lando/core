# Renderer Example

This example exists primarily to test the fallback non-TTY list renderer.

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should not error using the default renderer while packaged up
LANDO_RENDERER_FORCE=1 lando start

# Should use the simple renderer in a non-TTY environment
lando start | sed 's/\x1b\[[0-9;]*m//g' | grep --color=never '✔ Healthcheck' | wc -l | grep 3
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
