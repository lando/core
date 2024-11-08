---
title: lando start
description: lando start boots up the containers needed to serve, run and develop your application.
---

# lando start

Starts an app.

On first run this will build all relevant containers needed to run the app. On subsequent runs it will simply start the built containers.

::: warning Containers are cached!
If you start an app with a new service or container it will need to pull that container image down. This can take a moment depending on your internet connection. Subsequent pulls to that container or service are cached so they should be much faster.
:::

## Usage

```sh
lando start
```

## Options

```sh
--channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                               [boolean]
--debug        Shows debug output                                                                                         [boolean]
--help         Shows lando or delegated command help if applicable                                                        [boolean]
--verbose, -v  Runs with extra verbosity                                                                                    [count]
```
