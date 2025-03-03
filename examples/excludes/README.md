# Excludes Example

This example exists primarily to test the following:

* [Excluding](https://docs.lando.dev/config/performance.html#_3-excluding-directories)

## Start up tests

Run the following commands to get up and running with this example.

```bash
# Should start up successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to validate things are rolling as they should.

```bash
# Should exclude from non v4 services
lando exec defaults -- stat /app/excludes/file1

# Should not exclude in v4 services
lando exec defaults-v4 -- stat /usr/share/nginx/html/excludes/file1
docker inspect --format '{{ range .Mounts }}{{ if and (eq .Type "volume") (eq .Name "excludes_exclude_excludes") }}{{ printf "%+v\n" . }}{{ end }}{{ end }}' excludes_defaults-v4_1 | grep "Destination:/app/excludes" || echo $? | grep 1
```

## Destroy tests

Run the following commands to trash this app like nothing ever happened.

```bash
# Should be destroyed with success
lando destroy -y
lando poweroff
```
