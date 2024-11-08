---
title: lando config
description: lando config displays the lando configuration.
---

# lando config

Displays the lando configuration.


## Usage

```sh
lando config [--format <default|json|table>] [--path <path>]
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--format       Outputs in given format: default, json, table                                     [string] [choices: "default", "json", "table"]
--path         Returns the value at the given path                                                                     [string] [default: null]
```

## Examples

```sh
# Show me a config worthy of lando
lando config

# Show me only the "mode"
lando config --path mode

# Show me in json
lando config --format json

# Show envars in table format
lando config --format table --path env
```
