# Docker Desktop Smoke Tests

This example verifies a compact set of key Lando features against the default Docker Desktop version on macOS and Windows.

## Start up tests

```bash
# Should start an app with the default Docker Desktop version
lando poweroff
lando start
```

## Verification commands

```bash
# Should discover the running service
lando info --service appserver

# Should execute a command in the service
lando ssh --service appserver --command "echo lando-ssh-is-working"

# Should invoke custom tooling
lando node --version

# Should expose the service through the Docker engine
lando info --service appserver | grep running
```

## Destroy tests

```bash
# Should destroy the app and shared services
lando destroy -y
lando poweroff
```
