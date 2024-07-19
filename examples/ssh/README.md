# SSH Example

This example exists primarily to test the following documentation:

* [`lando ssh`](https://docs.lando.dev/cli/ssh.html)

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
# Should run a command as the LANDO_WEBROOT_USER by default in v3
lando ssh -s web2 -c "id | grep \$LANDO_WEBROOT_USER"

# Should run a command as root by default in l337 service
lando ssh -s web3 -c "id" | grep root

# Should run a command as the user specific
lando ssh -s web2 -u root -c "id | grep root"
lando ssh -s web3 -u root -c "id | grep root"

# Should run commands from /app for v3 services
lando ssh -s web2 -u root -c "pwd" | grep /app

# Should run commands from appMount for v4 services
lando ssh -s web3 -u root -c "pwd" | grep /usr/share/nginx/html
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
