# Exec Example

This example exists primarily to test the following documentation:

* [`lando exec`](https://docs.lando.dev/cli/exec.html)

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
# Should set the correct envvars
lando exec web -- env | grep LANDO_WEBROOT_USER | grep www-data
lando exec web -- env | grep LANDO_WEBROOT_GROUP | grep www-data
lando exec web2 -- env | grep LANDO_WEBROOT_USER | grep www-data
lando exec web2 -- env | grep LANDO_WEBROOT_GROUP | grep www-data
lando exec web3 -- env | grep LANDO_WEBROOT_USER | grep www-data
lando exec web3 -- env | grep LANDO_WEBROOT_GROUP | grep www-data
lando exec web4 -- env | grep LANDO_USER | grep nginx

# Should run a command as the default user
lando exec web -- whoami | grep www-data
lando exec web2 -- whoami | grep www-data
lando exec web3 -- whoami | grep root
lando exec web4 -- whoami | grep nginx
lando exec web4 -- "whoami | grep \$LANDO_USER"

# Should run a command as the --user
lando exec web -u root -- whoami | grep root
lando exec web2 -u root -- whoami | grep root
lando exec web3 -u root -- whoami | grep root
lando exec web4 -u root -- whoami | grep root

# Should run commands from appMount for
lando exec web -u root -- pwd | grep /app
lando exec web2 -u root -- pwd | grep /app
lando exec web3 -u root -- pwd | grep /usr/share/nginx/html
lando exec web4 -u root -- pwd | grep /usr/share/nginx/html

# Should track appMounted commands
cd folder
lando exec web2 -u root -- pwd | grep /app/folder
lando exec web3 -u root -- pwd | grep /usr/share/nginx/html/folder
lando exec web4 -u root -- pwd | grep /usr/share/nginx/html/folder

# Should load the correct lando environment
lando exec web -u root -- env | grep LANDO=ON
lando exec web2 -u root -- env | grep LANDO=ON
lando exec web2 -u root -- env | grep LANDO=ON
lando exec web4 -u root -- env | grep LANDO_ENVIRONMENT=loaded

# Should honor --debug on v4
lando exec web4 -- env | grep "LANDO_DEBUG=--debug" || echo $? || echo 1
lando exec web4 --debug -- env | grep LANDO_DEBUG=--debug

# Should be able to background commands with line ending ampersands
lando exec --user root alpine -- "sleep infinity &"
lando exec web2 -- "sleep infinity &"
lando exec web3 -- "sleep infinity &"
lando exec web4 -- "sleep infinity &"
lando exec --user root alpine -- ps a | grep "sleep infinity"
lando exec web2 -- ps -e -o cmd | grep "sleep infinity"
lando exec web3 -- ps -e -o cmd | grep "sleep infinity"
lando exec web4 -- ps -e -o cmd | grep "sleep infinity"
lando restart
lando exec --user root alpine -- sh -c "sleep infinity &"
lando exec web2 -- /bin/sh -c "sleep infinity &"
lando exec web3 -- bash -c "sleep infinity &"
lando exec --user root alpine -- ps a | grep "sleep infinity"
lando exec web2 -- ps -e -o cmd | grep "sleep infinity"
lando exec web3 -- ps -e -o cmd | grep "sleep infinity"

# Should run complex commands on v4
lando exec web4 -- "echo -n hello && echo there" | grep hellothere
lando exec web4 -- "nope || echo hellothere" | grep hellothere
lando exec web4 -- "echo -n hello; echo there;" | grep hellothere
lando exec web4 -- "echo -n hello; echo there;" | grep hellothere
lando exec web4 -- "echo \"\$MESSAGE\"" | grep hellothere
lando exec web4 -- echo "\$MESSAGE" | grep hellothere
lando exec web4 -- "mkdir -p /usr/share/nginx/html/test && echo hellothere > /usr/share/nginx/html/test/msg1 && cat /usr/share/nginx/html/test/msg1" | grep hellothere
lando exec web4 -- "mkdir -p /usr/share/nginx/html/test && echo -n hello >> /usr/share/nginx/html/test/msg2 && echo there >> /usr/share/nginx/html/test/msg2 && cat /usr/share/nginx/html/test/msg2" | grep hellothere
lando exec web4 -- "cat < /usr/share/nginx/html/test/msg2" | grep hellothere
lando exec web4 -- "echo hellothere &> /dev/null" | grep hellothere || echo $? || echo 1

# Should inherit users terminal cols and rows
lando exec web -- "tput cols | grep $(tput cols)"
lando exec web -- "tput lines | grep $(tput lines)"
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
