---
title: lando poweroff
description: No! Shut them all down! lando poweroff will stop ALL lando related apps and containers.
---

# lando poweroff

Spins down all lando related containers

This is useful if you want to deactivate all the containers needed to run Lando. If you have another service that requires usual system resources like ports `80` and `443` this command will free them up.

## Usage

```sh
lando poweroff
```

## Options

```sh
--channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                               [boolean]
--debug        Shows debug output                                                                                         [boolean]
--help         Shows lando or delegated command help if applicable                                                        [boolean]
--verbose, -v  Runs with extra verbosity                                                                                    [count]
```
