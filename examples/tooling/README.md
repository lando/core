Tooling Example
===============

This example exists primarily to test the following documentation:

* [Tooling](http://docs.devwithlando.io/config/tooling.html)

See the [Landofiles](http://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

Start up tests
--------------

```bash
# Should start successfully
lando poweroff
lando start
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# Should be able to run a few php commands
lando php -v
lando php -m
lando php -r "phpinfo();"

# Should run as meUser by default
lando whoami | grep www-data
lando whoami --service l337-php | grep www-data
lando nodeme | grep node
lando nodeme --service l337-node | grep node
lando stillme | grep node | wc -l | grep 2

# Should run as the specified user
lando iamroot
lando ssh -s php -c "cat /whoami | grep root"
lando iamroot --service l337-php
lando ssh -s l337-php -c "cat /whoami | grep root"
lando notme | grep www-data
lando notme --service l337-node | grep www-data

# Should be able to run multiple commands on one service
lando test
lando test2

# Should be able to define and pass down options to a script
lando word --word bird | grep "bird is the word"
lando word -w gird | grep "gird is the word"
lando word --word "this is actually a phrase" | grep "this is actually a phrase"
lando word --service l337-node --word bird | grep "bird is the word"
lando word --service l337-node -w gird | grep "gird is the word"
lando word --service l337-node --word "this is actually a phrase" | grep "this is actually a phrase"

# Should be able to run multiple commands on multiple services
lando env

# Should be able to choose the service to run the command on with an option
lando dynamic --service web
lando dynamic -s php
lando dynamic --service web2

# Should know how to handle pipes and carrots
lando pipesandstuff
cat pipe.txt | grep LANDO_
cat pipe.txt | grep more

# Should be able to set envvars
lando envvar | grep swift

# Should be able to use *
lando listfiles | grep /app/README.md

# Should be able to use command substitution
lando cmdsub | grep /app/README.md

# Should be able to run bash oneliners
lando oneliner | grep HOLLA

# Should be able to set the working directory
lando workdir | grep /tmp

# Should not track host if working dir is used
cd folder
lando workdir | grep "/tmp/"
lando workdir | grep /tmp/folder || echo "$?" | grep 1

# Should use and track appMount by default
lando pwd | grep /app
cd folder && lando pwd | grep /app/folder && cd ..
lando pwd --service l337-node | grep /app
cd folder && lando pwd --service l337-node | grep /app/folder && cd ..
lando pwd --service l337-php | grep /web
cd folder && lando pwd --service l337-php | grep /web/folder && cd ..

# Should use working_dir if no app mount for v4 services
lando pwd --service l337-slim | grep /tmp

# Should use first lando 3 service as default if no appserver
lando ssh -c "env" | grep PRIMARY_SERVICE | grep yes
```

Destroy tests
-------------

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
