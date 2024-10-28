---
title: lando version
description: If you can't guess what this command does you might want to consider a different career ;)
---

# lando version

Displays lando version information.

## Usage

```sh
lando version [--all] [--component <component>] [--full]
```

## Options

```sh
--channel        Sets the update channel                                                            [array] [choices: "edge", "none", "stable"]
--clear          Clears the lando tasks cache                                                                                         [boolean]
--debug          Shows debug output                                                                                                   [boolean]
--help           Shows lando or delegated command help if applicable                                                                  [boolean]
--verbose, -v    Runs with extra verbosity                                                                                              [count]
--all, -a        Shows all version information                                                                                        [boolean]
--component, -c  Shows version info for specific component                                                    [string] [default: "@lando/core"]
--full, -f       Shows full version string                                                                                            [boolean]
```

## Examples

```sh
# Show all version information
lando version --all

# Show full version string
lando version --full

# Show version information for the cli
lando version --component @lando/cli

# Do the same as above but in component shorthand
lando version --component cli
```
