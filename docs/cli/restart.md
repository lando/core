---
title: lando restart
description: lando restart stops your lando app and then starts it again, preserving container state.
---

# lando restart

Restarts your app.

[Stops](./stop.md) and then [starts](./start.md) an app. If you wish to rerun your build steps or you've altered your Landofile you should check out [rebuild](./rebuild.md).

## Usage

```sh
lando restart
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
```
