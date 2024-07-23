# Certificates Example

This example exists primarily to test the following documentation:

* [Networking](https://docs.devwithlando.io/config/certificates.html)

See the [Landofiles](https://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

# Start up tests

```bash
# Should start
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should have the correct entries in /certs/cert.ext
cd lamp
lando ssh -s appserver -c "cat /certs/cert.ext" | grep DNS.1 | grep -w appserver.landolamp.internal
lando ssh -s appserver -c "cat /certs/cert.ext" | grep DNS.2 | grep -w appserver
lando ssh -s appserver -c "cat /certs/cert.ext" | grep DNS.3 | grep -w localhost
lando ssh -s appserver -c "cat /certs/cert.ext" | grep lando-lamp.lndo.site
cd .. && cd lemp
lando ssh -s placeholder -c "cat /certs/cert.ext" | grep DNS.1 | grep -w placeholder.landolemp.internal
lando ssh -s placeholder -c "cat /certs/cert.ext" | grep DNS.2 | grep -w placeholder
lando ssh -s placeholder -c "cat /certs/cert.ext" | grep DNS.3 | grep -w localhost
lando ssh -s placeholder -c "cat /certs/cert.ext" | grep placeholder.lando-lemp.lndo.site

# Should have the correct internal hostname info
cd lamp
lando info -s appserver | grep hostnames: | grep appserver.landolamp.internal
cd .. && cd lemp
lando info -s placeholder | grep hostnames: | grep placeholder.landolemp.internal

# Should be able to self connect from lamp
cd lamp
lando ssh -s appserver -c "curl http://localhost"
lando ssh -s appserver -c "curl https://localhost"

# Should be able to self connect from lemp
cd lemp
lando ssh -s placeholder -c "curl http://localhost"
lando ssh -s placeholder -c "curl https://localhost"

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

## Destroy tests

```bash
# Should destroy lamp successfully
cd lamp && lando destroy -y

# Should destroy lemp successfully
cd lemp && lando destroy -y

# Should poweroff
lando poweroff
```
