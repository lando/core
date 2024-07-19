# Plugins Example

This example exists primarily to test the following documentation:

* [Plugins](https://docs.lando.dev/core/v3/plugins.html)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

Start up tests
--------------

```bash
# Should start successfully
lando poweroff
lando start
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# Should load plugins from pluginDirs
lando stuff | grep "I WORKED"

# Should load plugins specified in landofile
lando stuff2 | grep "I WORKED"
```

Destroy tests
-------------

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
