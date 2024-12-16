---
title: lando plugin-login
description: lando plugin-login logs you into a valid lando plugin registry
---

# lando plugin-login

Logs into a Lando plugin registry.

This will authorize your Lando installation against a Lando plugin registry. A "Lando Plugin Registry" is any `npm` compatible regsitry eg:

* `https://registry.npmjs.org`
* `https://npm.pkg.github.com`

If no registry is specified then `https://registry.npmjs.org` is used.

## Usage

```sh
lando plugin-login
  [--username <username>]
  [--password <password>]
  [--registry <registry>]
```

## Options

```sh
--channel       Sets the update channel                                                             [array] [choices: "edge", "none", "stable"]
--clear         Clears the lando tasks cache                                                                                          [boolean]
--debug         Shows debug output                                                                                                    [boolean]
--help          Shows lando or delegated command help if applicable                                                                   [boolean]
--verbose, -v   Runs with extra verbosity                                                                                               [count]
--password, -p  Sets the registry password                                                                                             [string]
--registry, -r  Sets registry                                                                  [string] [default: "https://registry.npmjs.org"]
--scope, -s     Sets scopes                                                                                                             [array]
--username, -u  Sets the registry username                                                                                             [string]
```


## Examples

```sh
# Login to https://registry.npmjs.org with interactive prompts
lando plugin-login

# Login to https://npm.pkg.github.com with interactive prompts
lando plugin-login --registry https://npm.pkg.github.com

# Login to https://registry.npmjs.org as riker with password $TOKEN
lando plugin-login --username riker --password "$TOKEN"
```
