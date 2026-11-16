---
title: Plugins
description: Lando sets a bunch of useful environment variables in each service by default, or you can inject your own by configuring your Landofile or using a custom environment file.
---

# Plugins

As of Lando `3.0.8` you can now load plugins from inside your application using `pluginDirs` in your Landofile. This is in addition to custom plugins that are automatically loaded from `~/.lando/plugins`.

```yaml
name: my-app
pluginDirs:
  - plugins
  - someplace/else
```

Note that these are relative to your application's root directory. Plugin functionality is the main part of Lando `3.1` so expect more improvements here based on [this spec](https://github.com/lando/lando/issues/2434).

For more information on writing plugins check out [these docs](https://docs.lando.dev/contrib/coder.html).

## Upgrading from Platform.sh to Upsun

The [Upsun plugin](https://docs.lando.dev/plugins/upsun) replaces `@lando/platformsh`
in the default plugin set. When both packages are installed, Lando loads Upsun and
skips the legacy Platform.sh implementation. Your Landofiles and saved credentials
are not changed. If only the legacy plugin is installed, Lando continues to load it.

Existing `recipe: platformsh` Landofiles work through Upsun's deprecated alias.
To use the new name, change it to `recipe: upsun` and run `lando rebuild`.
Once you have checked your app, you can remove the unused legacy package with
`lando plugin-remove @lando/platformsh`.

See the [Upsun installation guide](https://docs.lando.dev/plugins/upsun/install.html)
for authentication and migration details.
