---
title: lando list
description: lando list lists all running lando apps and containers and is filterable.
---

# lando list

Lists all running lando apps and containers.

Optionally you can include show not running services with `--all` or filter by `--app`.

Note that if `list` returns a single result you can forgo `[INDEX].property` usage with `--path` to access a property. See examples below.

## Usage

```sh
lando list [--all] [--filter <key=value>...] [--format <default|json|table>] [--path <path>]
```

## Options

```sh
--channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                               [boolean]
--debug        Shows debug output                                                                                         [boolean]
--help         Shows lando or delegated command help if applicable                                                        [boolean]
--verbose, -v  Runs with extra verbosity                                                                                    [count]
--all, -a      Show all containers, even those not running                                                                [boolean]
--app          Show containers for only a particular app                                                                   [string]
--filter       Filter data by "key=value"                                                                                   [array]
--format       Output in given format: default, json, table                          [string] [choices: "default", "json", "table"]
--path         Only return the value at the given path                                                     [string] [default: null]
```

## Examples

```sh
# Get all running lando services
lando list

# Get all lando services regardless of running status
lando list --all

# Get all services for an app called my-app regardless of running status
lando list -a --app my-app

# Get all services of kind=service, note the quotes are important
lando list --filter "kind=service"

# Get all the data as json
lando list --all --format json

# Get the name for the first service
lando list --path "[0].service"

# Get the name a particularly named service
lando list --filter name=myapp_myservice_1 --path service
```
