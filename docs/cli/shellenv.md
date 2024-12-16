---
title: lando shellenv
description: lando shellenv prints information you can use to add lando PATH info to a shell rcfile.
---

# lando shellenv

Prints information you can add to a shell rcfile like `~/.zshrc` to ensure `lando` is in `PATH`.

With `--add` you can specify a file to add the above lines to or you can omit a value for `--add` and `lando` will do its best to add the information to the correct file based on the shell you ran `lando shellenv` from.

Note that there are a few caveats here:

* `powershell.exe` _does_ have something like an rc file but it will require that you can execute local scripts. This does have security implications which you can read about in more detail [here](https://www.sqlshack.com/choosing-and-setting-a-powershell-execution-policy/).
* `cmd.exe` _does not_ have something like an rc file so in this case `--add` will run `setx` to update your user `PATH`.

Also note that generally you will not have to run this command unless you are switching shells or if you installed Lando without using our recommended [installer script](https://docs.lando.dev/install)

## Usage

```sh
lando shellenv [--check] [--shell <shell>]
```

## Options

```sh
--channel      Sets the update channel                                                  [array] [choices: "edge", "none", "stable"]
--clear        Clears the lando tasks cache                                                                               [boolean]
--debug        Shows debug output                                                                                         [boolean]
--help         Shows lando or delegated command help if applicable                                                        [boolean]
--verbose, -v  Runs with extra verbosity                                                                                    [count]
--add, -a      Add to shell profile if blank lando will attempt discovery                                                  [string]
--check, -c    Check to see if lando is in PATH                                                                           [boolean]
```

## Examples

```sh
# Check to see if Lando is already in PATH
lando shellenv --check

# Add lando to PATH for BASH
lando shellenv --shell bash
```
