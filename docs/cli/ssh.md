---
title: lando ssh
description: lando ssh docker execs into a Lando service, dropping you into a shell by default or running specific commands as a given user.
---

# lando ssh

Drops into a shell on a service, runs commands

Optionally you can run a command directly against a specific service without dropping into a shell and as a user you specify. If you find yourself running a lot of these commands then set up a [tooling route](https://docs.lando.dev/core/v3/tooling.html) or use some bash aliases.

Note that the default service is `appserver`. If you do not have a service called `appserver` then the first service listed in your Landofile will be used as the default.

::: warning
This command is now **deprecated** and will be removed in Lando 4. We recommend you try out the new [`lando exec`](./exec.md) especially if you are using `api: 4` services.
:::

## Usage

```sh
lando ssh [--command <command>] [--service <service>] [--user <user>]
```

## Options

Run `lando ssh --help` to get a complete list of options defaults, choices, etc.

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--command, -c  Runs a command in the service
--service, -s  SSHs into this service                                                                                         [default: "web2"]
--user, -u     Runs as a specific user
```

## Examples

```sh
# Drops into a bash shell on the appserver, falls back to sh if bash is unavailable
lando ssh

# Drop into a shell on the database service
lando ssh -s database

# List all the files in the root directory of the appserver
lando ssh -c "ls -ls /"

# Installs the vim package on the web service
lando ssh --service appserver --user root --command "apt-get update && apt install vim -y"
```
