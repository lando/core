# Lando V4 Service Example

This example exists primarily to test the v3 runtime implementation of following documentation:

* [Lando 4 service](https://docs.lando.dev/core/v4/landofile/services.html#lando-service)

## Start up tests

```bash
# should start successfully
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# should do something
true

# should run container operations as the host user
true
```

## Destroy tests

```bash
# should destroy successfully
lando destroy -y
lando poweroff
```
