# Storage Example

This example exists primarily to test the following documentation:

* [Lando 4 Service Storage](TBD)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start
rm -rf shared
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should create storage volumes with names that imply the scope
docker volume inspect lando-everywhere
docker volume inspect landostorage-stuff
docker volume inspect landostorage-alpine-some-cache-directory
docker volume inspect landostorage-db-some-other-dir
docker volume inspect landostorage-db-var-lib-mysql
docker volume list --filter "label=dev.lando.storage-volume=TRUE" | wc -l
docker volume list --filter "label=dev.lando.storage-volume=TRUE" | wc -l | grep 6

# Should create storage bind mounts
stat shared

# Should have correct labels on storage volumes
docker volume inspect lando-everywhere | grep "dev.lando.storage-volume" | grep TRUE
docker volume inspect lando-everywhere | grep "dev.lando.storage-scope" | grep global
docker volume inspect lando-everywhere | grep "dev.lando.storage-project" || echo "$?" | grep 1
docker volume inspect lando-everywhere | grep "dev.lando.storage-service" || echo "$?" | grep 1
docker volume inspect landostorage-stuff | grep "dev.lando.storage-volume" | grep TRUE
docker volume inspect landostorage-stuff | grep "dev.lando.storage-scope" | grep app
docker volume inspect landostorage-stuff | grep "dev.lando.storage-project" | grep landostorage
docker volume inspect landostorage-stuff | grep "dev.lando.storage-service" | grep db
docker volume inspect landostorage-alpine-some-cache-directory | grep "dev.lando.storage-volume" | grep TRUE
docker volume inspect landostorage-alpine-some-cache-directory | grep "dev.lando.storage-scope" | grep service
docker volume inspect landostorage-alpine-some-cache-directory | grep "dev.lando.storage-project" | grep landostorage
docker volume inspect landostorage-alpine-some-cache-directory | grep "dev.lando.storage-service" | grep alpine
docker volume inspect landostorage-db-some-other-dir | grep "dev.lando.storage-volume" | grep TRUE
docker volume inspect landostorage-db-some-other-dir | grep "dev.lando.storage-scope" | grep service
docker volume inspect landostorage-db-some-other-dir | grep "dev.lando.storage-project" | grep landostorage
docker volume inspect landostorage-db-some-other-dir | grep "dev.lando.storage-service" | grep db
docker volume inspect landostorage-db-var-lib-mysql | grep "dev.lando.storage-volume" | grep TRUE
docker volume inspect landostorage-db-var-lib-mysql | grep "dev.lando.storage-scope" | grep service
docker volume inspect landostorage-db-var-lib-mysql | grep "dev.lando.storage-project" | grep landostorage
docker volume inspect landostorage-db-var-lib-mysql | grep "dev.lando.storage-service" | grep db

# Should share app scoped storage volumes across all app services
lando exec db -- touch /stuff/test1
lando exec alpine -- touch /stuff/test2
lando exec alpine -- touch /things/test3
lando exec db -- ls -lsa /stuff | grep test1
lando exec db -- ls -lsa /stuff | grep test2
lando exec db -- ls -lsa /stuff | grep test3
lando exec db -- ls -lsa /stuff | wc -l | grep 6
lando exec alpine -- ls -lsa /stuff | grep test1
lando exec alpine -- ls -lsa /stuff | grep test2
lando exec alpine -- ls -lsa /stuff | grep test3
lando exec alpine -- ls -lsa /stuff | wc -l | grep 6
lando exec alpine -- ls -lsa /things | grep test1
lando exec alpine -- ls -lsa /things | grep test3
lando exec alpine -- ls -lsa /things | grep test5
lando exec alpine -- ls -lsa /things | wc -l | grep 6

# Should share global scoped storage volumes across all lando services
lando exec db -- touch /everywhere/test1
lando exec alpine -- touch /everywhere/test2
lando exec alpine -- touch /universal/test3
cd app2
lando start
lando exec alpine -- touch /everywhere/test4
lando exec alpine -- touch /universal/test5
lando exec alpine -- ls -lsa /everywhere | grep test1
lando exec alpine -- ls -lsa /everywhere | grep test2
lando exec alpine -- ls -lsa /everywhere | grep test3
lando exec alpine -- ls -lsa /everywhere | grep test4
lando exec alpine -- ls -lsa /everywhere | grep test5
lando exec alpine -- ls -lsa /everywhere | wc -l | grep 8
lando exec alpine -- ls -lsa /universal | grep test1
lando exec alpine -- ls -lsa /universal | grep test2
lando exec alpine -- ls -lsa /universal | grep test3
lando exec alpine -- ls -lsa /universal | grep test4
lando exec alpine -- ls -lsa /universal | grep test5
lando exec alpine -- ls -lsa /universal | wc -l | grep 8
cd ..
lando exec alpine -- ls -lsa /everywhere | grep test1
lando exec alpine -- ls -lsa /everywhere | grep test2
lando exec alpine -- ls -lsa /everywhere | grep test3
lando exec alpine -- ls -lsa /everywhere | grep test4
lando exec alpine -- ls -lsa /everywhere | grep test5
lando exec alpine -- ls -lsa /everywhere | wc -l | grep 8
lando exec db -- ls -lsa /everywhere | grep test1
lando exec db -- ls -lsa /everywhere | grep test2
lando exec db -- ls -lsa /everywhere | grep test3
lando exec db -- ls -lsa /everywhere | grep test4
lando exec db -- ls -lsa /everywhere | grep test5
lando exec db -- ls -lsa /everywhere | wc -l | grep 8
lando exec db -- ls -lsa /universal | grep test1
lando exec db -- ls -lsa /universal | grep test2
lando exec db -- ls -lsa /universal | grep test3
lando exec db -- ls -lsa /universal | grep test4
lando exec db -- ls -lsa /universal | grep test5
lando exec db -- ls -lsa /universal | wc -l | grep 8

# Should share storage bind mounts across all services to which they are mounted
lando exec alpine -- touch /shared/test1
lando exec alpine -- touch /shared-again/test2
lando exec db -- touch /shared/test3
lando exec db -- touch /shared-again/test4
cd app2
lando start
lando exec alpine -- touch /shared/test5
lando exec alpine -- ls -lsa /shared | grep test1
lando exec alpine -- ls -lsa /shared | grep test2
lando exec alpine -- ls -lsa /shared | grep test3
lando exec alpine -- ls -lsa /shared | grep test4
lando exec alpine -- ls -lsa /shared | grep test5
lando exec alpine -- ls -lsa /shared | wc -l | grep 8
cd ..
lando exec alpine -- ls -lsa /shared | grep test1
lando exec alpine -- ls -lsa /shared | grep test2
lando exec alpine -- ls -lsa /shared | grep test3
lando exec alpine -- ls -lsa /shared | grep test4
lando exec alpine -- ls -lsa /shared | grep test5
lando exec alpine -- ls -lsa /shared | wc -l | grep 8
lando exec alpine -- ls -lsa /shared-again | grep test1
lando exec alpine -- ls -lsa /shared-again | grep test2
lando exec alpine -- ls -lsa /shared-again | grep test3
lando exec alpine -- ls -lsa /shared-again | grep test4
lando exec alpine -- ls -lsa /shared-again | grep test5
lando exec alpine -- ls -lsa /shared-again | wc -l | grep 8
lando exec db -- ls -lsa /shared | grep test1
lando exec db -- ls -lsa /shared | grep test2
lando exec db -- ls -lsa /shared | grep test3
lando exec db -- ls -lsa /shared | grep test4
lando exec db -- ls -lsa /shared | grep test5
lando exec db -- ls -lsa /shared | wc -l | grep 8
lando exec db -- ls -lsa /shared-again | grep test1
lando exec db -- ls -lsa /shared-again | grep test2
lando exec db -- ls -lsa /shared-again | grep test3
lando exec db -- ls -lsa /shared-again | grep test4
lando exec db -- ls -lsa /shared-again | grep test5
lando exec db -- ls -lsa /shared-again | wc -l | grep 8

# Should allow source/target syntax to mount storage into different places
skip

# Should persist storage across rebuilds
# lando exec db -- mysql -u root -e "CREATE DATABASE vibes;"
skip

# Should persist global storage across destroys
# lando exec db -- mysql -u root -e "CREATE DATABASE vibes;"
skip

# Should create a storage volume with global scope if specified
skip

# Should create host bind mounted storage if specified
skip

# Should remove app scope storage volumes on destroy
skip

# Should set volume ownership to process owner by default
skip

# Should allow volume ownership to be specified
skip

# Should allow volume permissions to be specified
skip
```

## Destroy tests

```bash
# Should destroy and poweroff
cd app2
lando destroy -y
cd ..
lando destroy -y
lando poweroff
docker volume rm -f lando-everything
```
