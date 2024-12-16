---
title: lando logs
description: lando logs is a light wrapper around docker logs and shows container logs written to stdout or stderr.
---

# lando logs

Displays logs for your app.

You can optionally filter by a particular service, show timestamps or follow the logs a la `tail -f`.

::: warning Only shows logs written to `stdout` or `stderr`
Note that `lando logs` is a light wrapper around `docker logs` and as such it will only display logs that are written
to `stdout` of `stderr`. While we make a best effort to redirect logs when we can it is up to the user to redirect relevant
application logs.
:::

## Usage

```sh
lando logs [--follow] [--service <service>...] [--timestamps]
```

## Options

Run `lando logs --help` to get a complete list of options defaults, choices, etc.

```sh
--channel         Sets the update channel                                                           [array] [choices: "edge", "none", "stable"]
--clear           Clears the lando tasks cache                                                                                        [boolean]
--debug           Shows debug output                                                                                                  [boolean]
--help            Shows lando or delegated command help if applicable                                                                 [boolean]
--verbose, -v     Runs with extra verbosity                                                                                             [count]
--follow, -f      Follows the logs                                                                                   [boolean] [default: false]
--service, -s     Shows logs for the specified services only                                                                            [array]
--timestamps, -t  Shows log timestamps                                                                               [boolean] [default: false]
```

## Examples

```sh
# Get the logs=z
lando logs

# Follow the logs and show timestamps
lando logs -t -f

# Show logs for only the database and cache services
lando logs -s cache -s database
```
