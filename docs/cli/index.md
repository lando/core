---
title: Lando CLI Usage, How Do I Use It?
description: An overview of what the Lando CLI is.
---

# CLI

The Lando CLI is comprised of three distinct kinds of commands:

1. **Lando Commands** are commands that are available in all contexts and do things like start or stop an app, show the config or print log info.
2. **Tooling Commands** are recipe or user-provided commands that live in individual Landofiles, are only accessible on a per-app basis and can differ from app to app.
3. **Management Commands** are _hidden_ commands that are usually used by non-humans like [@lando/setup-lando](https://github.com/lando/setup-lando). They are mostly backports of [`hyperdrive`](https://github.com/lando/hyperdrive) for Lando 3.

## Lando Commands

```sh
Usage: lando <command> [args] [options]

Commands:
  lando config    Displays the lando configuration
  lando destroy   Destroys your app
  lando info      Prints info about your app
  lando init      Initializes code for use with lando
  lando list      Lists all running lando apps and containers
  lando logs      Displays logs for your app
  lando poweroff  Spins down all lando related containers
  lando rebuild   Rebuilds your app from scratch, preserving data
  lando restart   Restarts your app
  lando share     Shares your local site publicly
  lando ssh       Drops into a shell on a service, runs commands
  lando start     Starts your app
  lando stop      Stops your app
  lando update    Updates lando
  lando version   Displays the lando version

Options:
  --channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
  --clear        Clears the lando tasks cache                                                                               [boolean]
  --debug        Shows debug output                                                                                         [boolean]
  --help         Shows lando or delegated command help if applicable                                                        [boolean]
  --verbose, -v  Runs with extra verbosity                                                                                    [count]

Examples:
  lando start               Run lando start
  lando rebuild --help      Get help about using the lando rebuild command
  lando destroy -y --debug  Run lando destroy non-interactively and with maximum verbosity
  lando --clear             Clear the lando tasks cache

You need at least one command before moving on
```

## Tooling Commands


Each Landofile may implement _additional_ [tooling commands](https://docs.lando.dev/core/v3/tooling.html) that are only available for that application. These commands are usually wrappers for development tools like `lando composer` or `lando artisan` or `lando npm`.

Run `lando` inside of an app to see if it offers any app specific tooling options. Here is an example of what the default `lamp` recipe will give you. Note the additional app-specific commands like `lando composer` and `lando db-import`.

```sh
Usage: lando <command> [args] [options]

Commands:
  lando composer          Runs composer commands
  lando config            Displays the lando configuration
  lando db-export [file]  Exports database from a service into a file
  lando db-import <file>  Imports a dump file into database service
  lando destroy           Destroys your app
  lando info              Prints info about your app
  lando init              Initializes code for use with lando
  lando list              Lists all running lando apps and containers
  lando logs              Displays logs for your app
  lando mysql             Drops into a MySQL shell on a database service
  lando php               Runs php commands
  lando poweroff          Spins down all lando related containers
  lando rebuild           Rebuilds your app from scratch, preserving data
  lando restart           Restarts your app
  lando share             Shares your local site publicly
  lando ssh               Drops into a shell on a service, runs commands
  lando start             Starts your app
  lando stop              Stops your app
  lando update            Updates lando
  lando version           Displays the lando version

Options:
  --channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
  --clear        Clears the lando tasks cache                                                                               [boolean]
  --debug        Shows debug output                                                                                         [boolean]
  --help         Shows lando or delegated command help if applicable                                                        [boolean]
  --verbose, -v  Runs with extra verbosity                                                                                    [count]

Examples:
  lando start               Run lando start
  lando rebuild --help      Get help about using the lando rebuild command
  lando destroy -y --debug  Run lando destroy non-interactively and with maximum verbosity
  lando --clear             Clear the lando tasks cache

You need at least one command before moving on
```

Tooling is pretty powerful so make sure you check out the [docs](https://docs.lando.dev/core/v3/tooling.html) for it!

## Management Commands

Management commands are _hidden_ commands that you can use to help manage Lando plugins, dependencies and your Lando setup generally. Hidden means that they will not be listed when you run `lando` but they are still there and usable. For example if you are running Lando 3.21.0+ you can do this:

```sh
lando setup --help
```

If they were not hidden this is what they would look like:

```sh
Usage: lando <command> [args] [options]

Commands:
  lando plugin-add          Adds or updates a specific Lando plugin
  lando plugin-login        Logs into a Lando plugin registry
  lando plugin-logout       Logs out of a Lando plugin registry
  lando plugin-remove       Removes a Lando plugin
  lando setup               Gets your system ready to run Lando
  lando shellenv            Prints needed shell profile lines
```


As mentioned above these are backports of [`hyperdrive`](https://github.com/lando/hyperdrive) for Lando 3.

Generally you should not need them, see them or know anything about them unless Lando has specifically asked you to run them or you are doing things that are considered _advanced usage_ for Lando 3 like installing a third-party or non-core plugin.

You can read more about them in the "Mgmt Commands" section in the sidebar to the left.

## Known Limitations

### Using a real, non-emulated TTY

This is an upstream "restriction" imposed on us by NodeJS and python. We recommend using the shell shipped with [Git for Windows](https://gitforwindows.org/) but only the `cmd.exe` variant NOT the one powered by `minTTY`. That said your safest bet is to use `cmd.exe` or `PowerShell`. Other shells may work but have not been tested.

If your shell does not work you will likely see an error message like `the input device is not a TTY.`
See [https://github.com/nodejs/node/issues/3006](https://github.com/nodejs/node/issues/3006)

