---
title: lando version
description: If you can't guess what this command does you might want to consider a different career ;)
---

# lando version

Displays lando version information.

## Usage

```sh
lando version [--all] [--full] [--plugin <plugin>]
```

## Options

```sh
--channel        Sets the update channel                                                            [array] [choices: "edge", "none", "stable"]
--clear          Clears the lando tasks cache                                                                                         [boolean]
--debug          Shows debug output                                                                                                   [boolean]
--help           Shows lando or delegated command help if applicable                                                                  [boolean]
--verbose, -v    Runs with extra verbosity                                                                                              [count]
--all, -a        Shows all version information                                                                                        [boolean]
--full, -f       Shows full version string                                                                                            [boolean]
--plugin, -p     Shows version info for specific plugin                                                                                [string]
```

## Examples

```sh
# Show all version information
lando version --all

# Show full version string
lando version --full

# Show version information for the cli
lando version --plugin @lando/php

# Do the same as above but in component shorthand
lando version --plugin php
```
