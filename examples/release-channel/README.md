# Release Channel Example

This example exists primarily to test the following documentation:

* [Release Channels](https://docs.lando.dev/core/v3/releases.html)

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
# Should set the release channel as stable by default
lando config | grep "channel" | grep "stable"

# Should set the release channel based on the user option
lando --channel edge
lando config | grep "channel" | grep "edge"
lando --channel stable
lando config | grep "channel" | grep "stable"

# Should not allow bogus release channels
lando --channel orange || echo $? | grep 1
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
