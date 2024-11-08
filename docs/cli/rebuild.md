---
title: lando rebuild
description: lando rebuild rebuilds your app from scratch, preserving data and re-running any configured build steps as though you were starting your app for the first time.
---

# lando rebuild

Rebuilds your app from scratch, preserving data.

This will rebuild your app as though you were starting it for the first time, while preserving any database data. If you change your Landofile you'll want to run `lando rebuild` for these changes to take effect. This is also a great command to run if your app has gotten into a bad state and you want to set things right.

## Usage

```sh
lando rebuild [--service <service>...] [--yes]
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--service, -s  Rebuilds only the specified services                                                                                     [array]
--yes, -y      Answers yes to prompts                                                                                [boolean] [default: false]
```

## Examples

```sh
# Rebuild an app
lando rebuild

# Non-interactive rebuild
lando rebuild --yes

# Rebuild only the appserver and cache services
lando rebuild -s cache -s appserver
```
