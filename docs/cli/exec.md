---
title: lando exec
description: lando exec runs command(s) on a service
---

# lando exec

Runs command(s) on a service.

::: tip
`lando exec` is a **new** command intended to replace `lando ssh`. However, it currently works best on `api: 4` services. If you are experiencing issues on `api: 3` services we recommend you continue using [`lando ssh`](./ssh.md).
:::

## Usage

```sh
lando exec <service> [--user <user>] -- <command>
```

## Arguments

```sh
service  Runs on this service                                                                 [string] [choices: "web", "web2", "web3", "web4"]
```

### Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--user, -u     Runs as a specific user
```

## Examples

```sh
# Drops into a lando environment bash shell on the appserver
lando exec appserver -- lash bash

# Resolves the nginx services identity crisis
lando exec nginx --user root -- whoami

# Prints the environment and a wise greeting on my-service
lando exec my-service -- "env && echo 'hello there!'"

# Launches a background service on worker
lando exec worker -- "background-service &"
```
