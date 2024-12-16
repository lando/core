---
description: Lando isn't for everyone; so here are some helpful instructions on how to uninstall and purge Lando from macOS, Windows and Linux.
---

# Uninstalling

To uninstall Lando simply find and remove the `lando` binary. You can also [clean up lingering configuration](#further-cleanup) and [containers](#further-cleanup)

## macOS/Linux

```sh
# repeat this command until you get "lando not found"
rm -f "$(which lando)"
```

Note that you may need to prefix the above command with `sudo` if you installed `lando` in a directory owned by `root`.

## Windows

::: code-group
```powershell [powershell]
# repeat this command until you get an error
Remove-Item -Force (Get-Command lando).Source
```

```bash [bash]
# repeat this command until you get "could not find files"
rm -f "$(where lando | head -n1)"
```
:::

## Further cleanup

### Removing lingering Lando configuration

If you've uninstalled Lando but want to remove **ALL TRACES OF IT** you will also want to remove its configuration directory.

Unless you've edited Lando's [global config](https://docs.lando.dev/core/v3/global.html) Lando will store app configuration inside your home folder. You can use `lando config | grep userConfRoot` to locate the precise location on your machine. By default these locations will be:

| Operating System | Default Location |
| -- | -- |
| Win | `C:\Users\ME\.lando` |
| Linux | `~/.lando` |
| macOS | `~/.lando` |

To remove on Linux or macOS you can run `rm -rf ~/.lando`. You can use `explorer` to remove on Windows.

### Removing lingering Lando containers

You can also run this `docker` one-liner to force remove any Lando containers that, like the [Cranberries](https://www.youtube.com/watch?v=G6Kspj3OO0s) may still be lingering

```bash
docker rm -f $(docker ps --filter label=io.lando.container=TRUE --all -q)
```
