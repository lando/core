---
title: lando info
description: lando info prints useful information about your app like service connection information and urls.
---

# lando info

Prints info about your app.

Using this command you can see useful information such as:

* Shared container volumes
* Service versions, exposed ports, hostnames and access credentials
* Custom config file locations
* Other depends-on-which-service relevant things

Note that if `info` returns a single result you can forgo `[INDEX].property` usage with `--path` to access a property. See examples below.

## Usage

```sh
lando info
  [--deep]
  [--filter <key=value>...]
  [--format <default|json|table>]
  [--path <path>]
  [--service <service>...]
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--deep, -d     Gets ALL the info                                                                                     [boolean] [default: false]
--filter       Filters data by "key=value"                                                                                              [array]
--format       Outputs in given format: default, json, table                                     [string] [choices: "default", "json", "table"]
--path         Returns the value at the given path                                                                     [string] [default: null]
--service, -s  Gets info for only the specified services                                                                                [array]
```

## Examples

```sh
# Get app info
lando info

# Get super deep info about your app (this runs `docker inspect` under the hood)
lando info --deep

# Get super deep data as json
lando info --deep --format json

# Get API information about service three
lando info --path "[3].api"

# Do the same thing but a different way
lando info --service service-3 --path api

# Filter by api and verison
lando info --filter api=3 --filter version=custom
```
