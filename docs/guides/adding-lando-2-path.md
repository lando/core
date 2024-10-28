---
title: Adding Lando to PATH
description: Learn how to add Lando to PATH in the event that hasn't been automatically done for you.
guide: true

authors:
  - name: Team Lando
    pic: https://gravatar.com/avatar/c335f31e62b453f747f39a84240b3bbd
    link: https://twitter.com/devwithlando
updated:
  timestamp: 1709049201359

mailchimp:
  # action is required
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  # everything else is optional
  title: Want similar content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Adding Lando to PATH

Lando _should_ be added to your `PATH` environment variable when you install or update it. When an executable is in `PATH` you can invoke it by name instead of by its path as in this example:

```sh
# lando is in PATH
lando start

# lando is not in PATH
/my/weird/place/for/stuff/lando start
```

However, there are some situations where Lando may not be automatically added to `PATH`. For those situations you can use [`lando shellenv`](../shellenv.md) and do the below:

## Checking if Lando is in `PATH`

The most straightforward way to check is to simply run `lando` from a terminal and see if it returns the `lando` command list.

You can also do things like:

::: code-group
```sh [sh]
which lando
```

```bat [cmd.exe]
where lando
```

```powershell [powershell]
Get-Command lando
```
:::

If any of them fail or return nothing then congrats :tada: because `lando` is not in your `PATH`! :(

## Adding Lando to `PATH`

To add `lando` to `PATH` you first need to figure out the absolute path to the Lando binary. For the purposes of this we will assume the user has directly downloaded the Lando CLI to a special directory they created called `/all/my/bin`.

Here are a few ways you can use `lando shellenv` to add `lando` to `PATH`. Note that because `lando` is not in `PATH` you must invoke it using its absolute path.

```sh
# print the shellenv i need so i can copy/paste it to the relevant rc file
/all/my/bin/lando shellenv

# have lando attempt to add the shellenv to a shell rc file it thinks make sense
/all/my/bin/lando shellenv --add

# have lando add the shellenv to a file you want
/all/my/bin/lando shellenv --add ~/.specialrc

# directly append the output of shellenv to a file
/all/my/bin/lando shellenv >> ~/.anotherrc
```

Note that after any of the above commands you must either directly `source` the shell rc file that was edited or open a new terminal for the changes to apply. An example for most `macOS` users would be something like

```sh
source ~/.zshrc
```

You can then verify all is good with:

```sh
lando shellenv --check
```

## Caveats

### `cmd.exe`

`cmd.exe` _does not_ have an rc file or equivalent mechanism so if you run `lando shellenv --add` it will actually execute a `setx` behind the scenes to update your userspace `PATH` environment variable.

This means that the `lando` binary directory will be set in your registry and by extension available in all downstream shells.

### `powershell.exe`

By default `powershell` restricts the execution of _all_ scripts. This includes the rc file we generate for you.

If you are getting an `ExecutionPolicy` error when you launch `powershell` we recommend you make local script execution for yourself a bit more permissive with:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

If you are unsure about this re: security then we recommend you [read this](https://www.sqlshack.com/choosing-and-setting-a-powershell-execution-policy/).
