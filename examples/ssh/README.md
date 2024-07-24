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
# Should run a command as the default user
lando ssh -s web -c "id | grep \$LANDO_WEBROOT_USER"
lando ssh -s web2 -c "id | grep \$LANDO_WEBROOT_USER"
lando ssh -s web3 -c "id" | grep root
lando ssh -s web4 -c "whoami | grep \$LANDO_USER"

# Should run a command as the --user
lando ssh -s web -u root -c "id | grep root"
lando ssh -s web2 -u root -c "id | grep root"
lando ssh -s web3 -u root -c "id | grep root"
lando ssh -s web4 -u root -c "id | grep root"

# Should run commands from appMount for
lando ssh -s web -u root -c "pwd" | grep /app
lando ssh -s web2 -u root -c "pwd" | grep /app
lando ssh -s web3 -u root -c "pwd" | grep /usr/share/nginx/html
lando ssh -s web4 -u root -c "pwd" | grep /usr/share/nginx/html

# Should track appMounted commands
cd folder
lando ssh -s web2 -u root -c "pwd" | grep /app/folder
lando ssh -s web3 -u root -c "pwd" | grep /usr/share/nginx/html/folder
lando ssh -s web4 -u root -c "pwd" | grep /usr/share/nginx/html/folder

# Should load the v3 lando environment
lando ssh -s web -u root -c "env" | grep LANDO=ON
lando ssh -s web2 -u root -c "env" | grep LANDO=ON
lando ssh -s web2 -u root -c "env" | grep LANDO=ON
lando ssh -s web4 -u root -c "env" | grep LANDO=ON
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
