---
title: lando destroy
description: lando destroy completely destroys your application eg all data will be lost after running this command.
---

# lando destroy

Destroys your app.

After you run this command you will not be able to access the app or use Lando tooling for development unless you restart the app. The files (eg the git repo) for the app will not be removed but any database or index information will be _irretrievably lost_.

::: warning Only destroys an app, not Lando itself!
This command should not be confused with uninstalling Lando. It **will only** destroy the app that you use it on.
:::

## Usage

```sh
lando destroy [--yes]
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--yes, -y      Answers yes to prompts                                                                                [boolean] [default: false]
```

## Examples

```sh
# Interactive destruction
lando destroy

# Non-interactive destruction
lando destroy -y

# Destroy with debug output
lando destroy --debug

# Get help about the destroy command
lando destroy --help
```
