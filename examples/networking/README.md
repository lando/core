Networking Example
==================

This example exists primarily to test the following documentation:

* [Networking](http://docs.devwithlando.io/config/networking.html)

See the [Landofiles](http://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

Start up tests
--------------

```bash
# Should init and start a lamp recipe
rm -rf lamp && mkdir -p lamp
cp -rf index.php lamp/index.php
cp -rf apache.conf lamp/apache.conf
cp -rf .lando.lamp.yml lamp/.lando.yml
cd lamp && lando start

# Should init and start a lemp recipe
rm -rf lemp && mkdir -p lemp
cp -rf index.php lemp/index.php
cp -rf apache.conf lemp/apache.conf
cp -rf nginx.conf lemp/nginx.conf
cp -rf .lando.lemp.yml lemp/.lando.yml
cd lemp && lando start
```

Verification commands
---------------------

Run the following commands to verify things work as expected

```bash
# Should have the correct entries in /certs/cert.ext
cd lamp
lando ssh -s appserver -c "cat /certs/cert.ext | grep lndo.site"
lando ssh -s appserver -c "cat /certs/cert.ext | grep landolamp.internal"
lando ssh -s appserver -c "cat /certs/cert.ext | grep appserver"
lando ssh -s appserver -c "cat /certs/cert.ext | grep localhost"

# Should be able to curl lemp from lamp at proxy addresses and internal hostnames
cd lamp
lando ssh -s appserver -c "curl http://lando-lemp.lndo.site"
lando ssh -s appserver -c "curl http://appserver_nginx.landolemp.internal"
# lando ssh -s appserver -c "curl https://lando-lemp.lndo.site"
# lando ssh -s appserver -c "curl https://appserver_nginx.landolemp.internal"
lando ssh -s appserver -c "curl https://placeholder.lando-lemp.lndo.site"
lando ssh -s appserver -c "curl https://placeholder.landolemp.internal"

# Should be able to curl lamp from lemp at proxy addresses and internal hostname
cd lemp
lando ssh -s appserver -c "curl http://lando-lamp.lndo.site"
lando ssh -s appserver -c "curl http://appserver.landolamp.internal"
# lando ssh -s appserver -c "curl https://lando-lamp.lndo.site"
# lando ssh -s appserver -c "curl https://appserver.landolamp.internal"
lando ssh -s placeholder -c "curl https://lando-lamp.lndo.site"
lando ssh -s placeholder -c "curl https://appserver.landolamp.internal"

# Should even be able to connect to a database in a different app
cd lamp
lando ssh -s database -c "mysql -uroot -h database.landolemp.internal -e 'quit'"
```

Destroy tests
-------------

```bash
# Should destroy lamp successfully
cd lamp && lando destroy -y

# Should destroy lemp successfully
cd lemp && lando destroy -y

# Should poweroff
lando poweroff
```
