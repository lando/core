---
title: lando plugin-add
description: lando plugin-add installs the plugin(s) indicated in the primary argument.
---

# lando plugin-add

Installs plugins.

Plugins will be installed in `~/.lando/plugins` by default unless you've modified your [global config](https://docs.lando.dev/core/v3/index.html) to install them elsewhere.

## Usage

```sh
lando plugin-add <plugin> [plugin...]
  [--auth <auth>...]
  [--registry <registry>...]
  [--scope <scope>...]
```

## Options

```sh
--channel                    Sets the update channel                                                [array] [choices: "edge", "none", "stable"]
--clear                      Clears the lando tasks cache                                                                             [boolean]
--debug                      Shows debug output                                                                                       [boolean]
--help                       Shows lando or delegated command help if applicable                                                      [boolean]
--verbose, -v                Runs with extra verbosity                                                                                  [count]
--auth, -a                   Sets global or scoped auth                                                                   [array] [default: []]
--registry, -r, -s, --scope  Sets global or scoped registry                                                               [array] [default: []]
```

## Examples

```sh
# Install @lando/php
lando plugin-add @lando/php@1.2.0

# Installs @lando/php@1.2.0 & @lando/node
lando plugin-add @lando/php@1.2.0 @lando/node

# Install @lando/php from a local source
lando plugin-add @lando/php@file:~/my-php-plugin

# Install @lando/node from the main branch of github.com/lando/node
lando plugin-add lando/node#main

# Install a plugin from an external git url reg
lando plugin-add https://github.com/pirog/plugin.git#v1.2.1

# Installs a private plugin from https://npm.pkg.github.com
lando plugin-add @myorg/php --auth "$TOKEN" --registry https://npm.pkg.github.com

# Installs @lando/php & a private plugin from https://npm.pkg.github.com
lando plugin-add @lando/php @myorg/mysql --auth "//npm.pkg.github.com/:_authToken=$TOKEN" --scope myorg:registry=https://npm.pkg.github.com
```
