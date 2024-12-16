---
title: lando update
description: lando update updates all of Lando's components, including installed plugins.
---

# lando update

Updates Lando.

This will update all the constituent components of Lando, including `@lando/core`, `@lando/cli`, and any Lando plugins you may have installed (ex: `@lando/php`).

Note that if you have installed a plugin via source or a development version of a component you will not be able to update until you remove those components and re-install them. [`lando plugin-add`](./plugin-add.md) is good for this purpose.

Also note that you can [set the release channel](https://docs.lando.dev/core/v3/releases.html) to `edge` to get more _bleeding edge_ updates.

## Usage

```sh
lando update [--yes]
```

## Options

```sh
--channel      Sets the update channel                                                              [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                                           [boolean]
--debug        Shows debug output                                                                                                     [boolean]
--help         Shows lando or delegated command help if applicable                                                                    [boolean]
--verbose, -v  Runs with extra verbosity                                                                                                [count]
--yes, -y      Runs non-interactively with all accepted default answers                                              [boolean] [default: false]
```
