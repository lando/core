Setup Test
===========

This example exists primarily to test the following documentation:

* [setup](https://docs.lando.dev/cli/setup.html)

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

# Should start with no plugins
lando config | grep -qv "plugins/@lando/php"

# Should be able to run lando setup.
lando setup -y
lando config | grep -q "plugins/@lando/php"
```
