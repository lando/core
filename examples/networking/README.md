# Networking Example

This example exists primarily to test the following documentation:

* [Networking](https://docs.devwithlando.io/config/networking.html)

See the [Landofiles](https://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should init and start a lamp app
rm -rf lamp && mkdir -p lamp
cp -rf index.php lamp/index.php
cp -rf apache.conf lamp/apache.conf
cp -rf .lando.lamp.yml lamp/.lando.yml
cd lamp && lando start

# Should init and start a lemp app
rm -rf lemp && mkdir -p lemp
cp -rf index.php lemp/index.php
cp -rf nginx.conf lemp/nginx.conf
cp -rf .lando.lemp.yml lemp/.lando.yml
cd lemp && lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should have the correct internal hostname info
cd lamp
lando info -s appserver | grep hostnames: | grep appserver.landolamp.internal
cd .. && cd lemp
lando info -s appserver | grep hostnames: | grep appserver.landolemp.internal
lando info -s appserver_nginx | grep hostnames: | grep appserver_nginx.landolemp.internal

# Should be able to self connect from lamp
cd lamp
lando exec appserver -- curl http://localhost
lando exec appserver -- curl https://localhost

# Should be able to self connect from lemp
cd lemp
lando exec appserver_nginx -- curl http://localhost:8080
lando exec appserver_nginx -- curl https://localhost:8443

# Should be able to curl lemp from lamp at proxy addresses and internal hostnames
cd lamp
lando exec appserver -- curl http://lando-lemp.lndo.site
lando exec appserver -- curl http://appserver_nginx.landolemp.internal:8080
lando exec appserver -- curl https://lando-lemp.lndo.site
lando exec appserver -- curl https://appserver_nginx.landolemp.internal:8443

# Should be able to curl lamp from lemp at proxy addresses and internal hostname
cd lemp
lando exec appserver_nginx -- curl http://lando-lamp.lndo.site
lando exec appserver_nginx -- curl http://appserver.landolamp.internal
lando exec appserver_nginx -- curl https://lando-lamp.lndo.site
lando exec appserver_nginx -- curl https://appserver.landolamp.internal

# Should even be able to connect to a database in a different app
cd lamp
lando exec database -- mysql -uroot -h database.landolemp.internal -e "quit"

# Should have 32 networks by default
lando config | grep "networkLimit" | grep 32

# Should be able to set the networkLimit in config
cp config.yml ~/.lando/config.yml
lando --clear
lando config | grep "networkLimit" | grep 64
```

## Destroy tests

```bash
# Should destroy lamp successfully
cd lamp && lando destroy -y

# Should destroy lemp successfully
cd lemp && lando destroy -y

# Should poweroff
lando poweroff
```
