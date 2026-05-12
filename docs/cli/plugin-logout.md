---
title: lando plugin-logout
description: lando plugin-logout Logs you out of all active sessions established by lando plugin-login
---

# lando plugin-logout

Logs you out of _all_ active sessions established by `lando plugin-login` by clearing `~/.lando/plugin-auth.json`.

::: warning System-level credentials are not affected
If credentials were deployed to the system-level `plugin-auth.json` (by an IT/MDM process), this command will not remove them. Those must be removed manually from the system path.
:::

## Usage

```sh
lando plugin-logout
```

## Options

```sh
--channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                               [boolean]
--debug        Shows debug output                                                                                         [boolean]
--help         Shows lando or delegated command help if applicable                                                        [boolean]
--verbose, -v  Runs with extra verbosity                                                                                    [count]
```
