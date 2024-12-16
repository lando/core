---
description: Get some help if you have problems with Lando after updating.
---

# Updating

While we try to make updating as seamless as possible Lando has _a lot_ of moving parts so sometimes there are edge cases we miss.

If you find yourself amongst the lucky edge cases we've prepared this guide to help you work through them on your own.

## 1. Where is `lando update`?

If you don't have a `lando update` command we recommend you first install/update via the [latest available package installer](https://github.com/lando/lando/releases).

Note that the latest package installer may be a few versions behind where we are today but that's ok because once you have it you can then `lando update`!

## 2. Why did my app stop working?

### `lando rebuild`

The vast majority of app specific errors you may run into after updating can be resolved by running a `lando rebuild` on the problematic app. This will ensure your container is clean, up to date and rebuilt against the updated `lando` and `docker` versions.

```bash
lando rebuild -y
```

### Force remove the proxy

If you're having trouble with `*.lndo.site` or custom `proxy` urls, and you've already determined you do not have an issue with [DNS Rebinding protection](./dns-rebind.md) then manually force removing the `proxy` container and restarting your app could help.

```bash
# Remove the proxy
docker rm -f landoproxyhyperion5000gandalfedition_proxy_1

# Restart the app
lando restart
```

Note that if you have other apps running when you force remove the `proxy` you will likely need to `lando restart` them as well.

## 3. Why isn't the CLI updating?

When `lando update` was in `beta` there were a few issues we had to resolve that now require some manual remediation. Here are a few of the big ones:

### Manually updating first

If you are on the `v3.21.0-beta` series then it's probably best to [manually update](#_1-where-is-lando-update) before running `lando update` again.

### Permissions errors

If you are getting errors about files in either `~/.lando/config` or `~/.lando/scripts` we recommend the following:

```sh
lando poweroff
rm -rf ~/.lando/config ~/.lando/scripts
lando update
```

### CLI reporting wrong version

If you installed Lando with the older package installer, particularly on Windows, you may have an older version of Lando sitting higher up in `PATH`.

You can check to see which `lando` is being invoked with the below:

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

If the response to the above command is not where you chose to install Lando, which is `~/.lando/bin/lando` by default then you should follow the below steps.

1. Remove the `lando` reported by `which|where|Get-Command` or remove the directory it lives in from `PATH`.
2. Rerun `which|where|Get-Command lando` and if it reports the wrong directory then repeat Step 1.

## 4. Why are some services not working?

You may have accidentally installed the _slim_ version of `lando` which does not include any Lando plugins by default.

You can usually fix this by simply running the hidden command:

```sh
lando setup
```

You can read more about that command [here](https://docs.lando.dev/cli/setup.html)

## 5. What if I'm still stuck?

If you get this far and things are still not working the most likely scenario is you've found a legitimate bug which you should report. To do that either:

* [Join the Lando slack](https://www.launchpass.com/devwithlando) and report there
* [Spin up an issue on GitHub](https://github.com/lando/lando/issues/new/choose)
