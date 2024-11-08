---
title: lando plugin-remove
description: lando plugin-remove removes the plugin(s) indicated in the primary argument.
---

# lando plugin-remove

Removes plugins.

## Usage

```sh
lando plugin-remove <plugin> [plugin...]
```

## Arguments

```sh
plugin  Removes these plugins                                                                                                          [string]
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity
```

## Examples

```sh
# Remove a few plugins
lando plugin-remove @lando/php @lando/node
```
