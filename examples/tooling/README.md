# Tooling Example

This example exists primarily to test the following documentation:

* [Tooling](https://docs.devwithlando.io/config/tooling.html)

See the [Landofiles](https://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should be able to run a few php commands
lando php -v
lando php -m
lando php -r "phpinfo();"

# Should run as correct user
lando whoami | grep www-data
lando whoami --service l337-php | grep root
lando nodeme | grep node
lando nodeme --service l337-node | grep node
lando stillme | grep node | wc -l | grep 2
lando whoami --service lando4 | grep bob

# Should run as the specified user
lando iamroot
lando exec php -- cat /whoami | grep root
lando iamroot --service l337-php
lando exec l337-php -- cat /whoami | grep root
lando notme | grep www-data
lando notme --service l337-node | grep www-data
lando iamroot --service lando4 | grep root

# Should be able to run multiple commands on one service
lando test
lando test2

# Should be able to define and pass down options and args to a script
lando word --word bird | grep "bird is the word"
lando word -w gird | grep "gird is the word"
lando word --word "this is actually a phrase" | grep "this is actually a phrase"
lando word --service l337-node --word bird | grep "bird is the word"
lando word --service l337-node -w gird | grep "gird is the word"
lando word --service l337-node --word "this is actually a phrase" | grep "this is actually a phrase"
lando word-engine --random 1 | grep "bird is the word"
lando word-engine bird --random 1 | grep "bird is the word"
lando word-engine gird --random 1 | grep "gird is the word"
lando word-engine "this is actually a phrase" --random 1 | grep "this is actually a phrase"
lando word-engine --random 1 --service l337-node bird | grep "bird is the word"
lando word-engine --random 1 --service l337-node gird | grep "gird is the word"
lando word-engine --random 1 --service l337-node "this is actually a phrase" | grep "this is actually a phrase"
lando lonely-bird

# Should be able to run multiline tooling commands on all sapis
lando word-imported --word larrybird | grep "larrybird is the word"
lando word-imported --service l337-node --word larrybird | grep "larrybird is the word"
lando word-imported --service lando4 --word larrybird | grep "larrybird is the word"

# Should be able to use multiline wrapped scripts on all sapis
lando word-wrapped --word larrybird | grep "larrybird is the word"
lando word-wrapped --service l337-node --word larrybird | grep "larrybird is the word"
lando word-wrapped --service lando4 --word larrybird | grep "larrybird is the word"

# Should be able run mutliple multiline command on multiple services regardless of sapi
lando all-the-words | wc -l | grep 3

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
lando dynamic --service lando4 | grep cyrus

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
lando workdir | grep "/tmp"
lando workdir | grep /tmp/folder || echo "$?" | grep 1

# Should use /app as the default appMount for v3 services
lando exec web -- pwd | grep /app
lando exec web2 -- pwd | grep /app
lando exec php -- pwd | grep /app
lando exec node -- pwd | grep /app

# Should use and track appMount by default
lando pwd | grep /app
cd folder && lando pwd | grep /app/folder && cd ..
lando pwd-app | grep /app
cd folder && lando pwd-app | grep /app/folder && cd ..
lando pwd-app --container l337-node | grep /app
cd folder && lando pwd-app --container l337-node | grep /app/folder && cd ..
lando ssh -c "pwd" | grep /app
cd folder && lando ssh -c "pwd" | grep /app/folder && cd ..
lando pwd --service l337-node | grep /app
cd folder && lando pwd --service l337-node | grep /app/folder && cd ..
lando exec l337-node -- pwd | grep /app
cd folder && lando exec l337-node -- pwd | grep /app/folder && cd ..
lando pwd --service l337-php | grep /web
cd folder && lando pwd --service l337-php | grep /web/folder && cd ..
lando exec l337-php -- pwd | grep /web
cd folder && lando exec l337-php -- pwd | grep /web/folder && cd ..
lando pwd --service web | grep /app
cd folder && lando pwd --service web | grep /app/folder && cd ..
lando exec web -- pwd | grep /app
cd folder && lando exec web -- pwd | grep /app/folder && cd ..

# Should use working_dir if no app mount for v4 services
lando pwd --service l337-slim | grep /tmp

# Should use first lando 3 service as default if no appserver
lando ssh -c "env" | grep PRIMARY_SERVICE | grep yes

# Should load lando4 environment
lando l4env | grep LANDO_ENVIRONMENT | grep loaded
lando dynamic --service lando4 | grep LANDO_ENVIRONMENT | grep loaded

# Should honor --debug on v4
lando l4env -- env | grep "LANDO_DEBUG=--debug" || echo $? || echo 1
lando l4env --debug -- env | grep LANDO_DEBUG=--debug

# Should background commands with line ending ampersands
lando backgrounder
lando --service node backgrounder
lando --service l337-slim backgrounder
lando --service lando4 backgrounder
lando exec --user root alpine -- ps a | grep "sleep infinity"
lando exec --user root node -- ps -e -o cmd | grep "sleep infinity"
lando exec --user root l337-slim -- ps a | grep "sleep infinity"
lando exec --user root lando4 -- ps -e -o cmd | grep "sleep infinity"

# Should allow for positional pasthru in task definition
lando everything --help | grep arg1 | grep "Uses arg1" | grep "choices:" | grep thing | grep stuff
lando everything --help | grep arg2 | grep "Uses arg2"
lando everything thing morething | grep "thing morething"
lando everything stuff morestuff | grep "stuff morestuff"

# Should allow for usage pasthru in task definition
lando everything --help | grep "lando everything \[arg1\] \[arg2\] MORETHINGS"

# Should allow for example pasthru in task definition
lando everything --help | grep "lando this is just for testing"

# Should be able to access scriptsDir from the landofile
lando exec node -- stat /etc/lando/service/helpers/args.sh
lando sdargs hello there | grep "hello there"

# Should be able to run even if options are empty
lando emptyopter

# Should inherit users terminal cols and rows
lando cols
lando lines
cat cols | grep "$(tput cols)"
cat lines | grep "$(tput lines)"
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
