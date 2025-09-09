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
docker volume inspect landostorage-owners-someplace
docker volume inspect landostorage-owners-someplace-free
docker volume inspect landostorage-owners-someplace-secret
docker volume list --filter "label=dev.lando.storage-volume=TRUE" | wc -l | grep 9

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
lando exec alpine -- ls -lsa /things | grep test2
lando exec alpine -- ls -lsa /things | grep test3
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
lando exec db -- ls -lsa /everywhere | grep test1
lando exec db -- ls -lsa /everywhere | grep test2
lando exec db -- ls -lsa /everywhere | grep test3
lando exec db -- ls -lsa /everywhere | grep test4
lando exec db -- ls -lsa /everywhere | grep test5
lando exec db -- ls -lsa /everywhere | wc -l | grep 8
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
cd app2
lando destroy -y

# Should share storage bind mounts across all services to which they are mounted
lando exec db -- touch /shared/test1
lando exec db -- touch /shared-again/test2
lando exec alpine -- touch /shared/test3
lando exec alpine -- touch /shared-again/test4
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
cd app2
lando destroy -y

# Should allow source/target syntax to mount storage into different places
lando exec db -- stat /shared-again/test1
lando exec db -- stat /var/lib/mysql-backup/ibdata1
lando exec alpine -- stat /shared-again/test1
lando exec alpine -- stat /things/test1
lando exec alpine -- stat /universal/test1

# Should persist storage across rebuilds
lando exec db -- mysql -u root -e "CREATE DATABASE IF NOT EXISTS vibes;"
lando exec db -- mysql -u root -e "SHOW DATABASES;" | grep vibes
lando rebuild -y || lando rebuild -y --debug
lando exec db -- mysql -u root -e "SHOW DATABASES;" | grep vibes
lando exec db -- stat /shared-again/test1
lando exec alpine -- stat /shared-again/test1
lando exec alpine -- stat /things/test1
lando exec alpine -- stat /universal/test1

# Should not persist non-global storage volumes across rebuilds
lando destroy -y
docker volume inspect lando-everywhere
docker volume inspect landostorage-stuff || echo "$?" | grep 1
docker volume inspect landostorage-alpine-some-cache-directory || echo "$?" | grep 1
docker volume inspect landostorage-db-some-other-dir || echo "$?" | grep 1
docker volume inspect landostorage-db-var-lib-mysql || echo "$?" | grep 1
docker volume list --filter "label=dev.lando.storage-volume=TRUE" | wc -l | grep 2
lando start
lando exec db -- mysql -u root -e "SHOW DATABASES;" | grep vibes || echo "$?" | grep 1
lando exec alpine -- stat /stuff/test1 || echo "$?" | grep 1
lando exec alpine -- stat /things/test1 || echo "$?" | grep 1

# Should persist global storage across destroys
lando destroy -y
docker volume inspect lando-everywhere
docker volume inspect landostorage-stuff || echo "$?" | grep 1
docker volume inspect landostorage-alpine-some-cache-directory || echo "$?" | grep 1
docker volume inspect landostorage-db-some-other-dir || echo "$?" | grep 1
docker volume inspect landostorage-db-var-lib-mysql || echo "$?" | grep 1
docker volume list --filter "label=dev.lando.storage-volume=TRUE" | wc -l | grep 2
lando start
lando exec alpine -- stat /universal/test1
lando exec alpine -- stat /everywhere/test1

# Should set initial volume ownership to process owner by default
lando exec db -- stat /var/lib/mysql | grep Uid: | grep mysql
lando exec db -- stat /some/other/dir | grep Uid: | grep mysql
lando exec db -- stat /stuff | grep Uid: | grep mysql
lando exec db -- stat /everywhere | grep Uid: | grep mysql
lando exec db -- stat /var/run/mysqld | grep Uid: | grep mysql
lando exec db -- stat /var/lib/mysql-backup | grep Uid: | grep mysql
lando exec alpine -- stat /some/cache/directory | grep Uid: | grep me
lando exec alpine -- stat /stuff | grep Uid: | grep me
lando exec alpine -- stat /everywhere | grep Uid: | grep me
lando exec alpine -- stat /things | grep Uid: | grep me
lando exec alpine -- stat /universal | grep Uid: | grep me

# Should allow volume ownership to be specified
lando exec owners -- stat /someplace | grep Uid: | grep games
lando exec owners -- stat /someplace-secret | grep Uid: | grep root
lando exec owners -- stat /someplace-free | grep Uid: | grep root
lando exec owners -- touch /someplace-secret/me || echo "$?" | grep 1
lando exec --user root owners -- touch /someplace-secret/root
lando exec owners -- stat /someplace-secret/root

# Should allow volume permissions to be specified
lando exec owners -- stat /someplace-free | grep Access: | grep "0777"
lando exec owners -- touch /someplace-free/me
lando exec owners -- stat /someplace-free/me

# Should allow for top level volumes to still be used with overrides.volumes
docker volume inspect my-data || echo "$?" | grep 1
docker volume inspect landostorage_my-data
docker volume inspect landostorage_my-data | grep com.docker.compose.project | grep landostorage
docker volume inspect landostorage_my-data | grep com.docker.compose.volume | grep my-data
lando exec --user root db -- touch /my-data/thing
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
