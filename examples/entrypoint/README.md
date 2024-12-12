# Entrypoint Example

This example exists primarily to test the following documentation:

* [Lando 4 Entrypoint](TBD)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should be able to load an entrypoint from a script file
lando exec web1 -- stat /tmp/test
lando exec web1 -- curl http://localhost:3000/example | grep "this is an example"

# Should be able to set the entrypoint from a string
lando exec web2 -- stat /tmp/test
lando exec web2 -- curl http://localhost:3000/example | grep "this is an example"

# Should be able to set the entrypoint from a multiline string
lando exec web3 -- stat /tmp/test
lando exec web3 -- curl http://localhost:3000/example | grep "this is an example"

# Should be able to use an entrypoint in the image
lando exec web4 -- stat /tmp/test
lando exec web4 -- curl http://localhost:3000/example | grep "this is an example"

# Should be able to fallback to the entrypoint CMD instruction in exec form
lando exec web5 -- stat /tmp/test
lando exec web5 -- curl http://localhost:3000/example | grep "this is an example"
```

## Destroy tests

```bash
# Should destroy and poweroff
lando destroy -y
lando poweroff
```
