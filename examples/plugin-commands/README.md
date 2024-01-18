Plugin Login Test
================

This example exists primarily to test the following documentation:

* [plugin-login](https://docs.lando.dev/cli/plugin-login.html)

Start up tests
--------------

Run the following commands to get up and running with this example.

```bash
# Should poweroff
lando poweroff

```

Verification commands
---------------------

Run the following commands to validate things are rolling as they should.

```bash
# Should be able to add a public plugin via a registry string.
lando config | grep -qv "plugins/@lando/php"
lando plugin-add "@lando/php"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from local directory.
wget https://github.com/lando/php/archive/refs/heads/main.tar.gz && tar -xf main.tar.gz
lando plugin-add "./php-main"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from a remote tarball.
lando config | grep -qv "plugins/@lando/php"
lando plugin-add "https://github.com/lando/php/archive/refs/heads/main.tar.gz"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from a git string `lando/plugin#branch`
lando plugin-add "lando/php#main"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php" 

# Should be able to add a plugin from a git repo URL.
lando plugin-add "https://github.com/lando/php.git"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should execute `lando plugin-login`
lando plugin-login --registry "https://npm.pkg.github.com" --password "$PIROG_TOKEN" --username "pirog" --scope "@lando"

# Should be able to add and remove a private plugin via a registry string.
lando config | grep -qv "plugins/@lando/lando-plugin-test"
lando plugin-add "@lando/lando-plugin-test"
lando config | grep -q "plugins/@lando/lando-plugin-test"
lando plugin-remove "@lando/lando-plugin-test"
lando config | grep -qv "plugins/@lando/lando-plugin-test"
```
