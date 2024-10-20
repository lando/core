# Certificates Example

This example exists primarily to test the following documentation:

* [Lando 3 Certs](https://docs.lando.dev/core/v3/services/lando.html#ssl)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should set the environment variables correctly
lando exec web -- env | grep LANDO_SERVICE_CERT | grep /lando/certs/web.landocerts.crt
lando exec web -- env | grep LANDO_SERVICE_KEY | grep /lando/certs/web.landocerts.key
lando exec web2 -- env | grep LANDO_SERVICE_CERT | grep /etc/lando/certs/cert.crt
lando exec web2 -- env | grep LANDO_SERVICE_KEY | grep /etc/lando/certs/cert.key
lando exec web3 -- env | grep LANDO_SERVICE_CERT | grep /certs/cert.crt
lando exec web3 -- env | grep LANDO_SERVICE_KEY | grep /certs/cert.key
lando exec web4 -- env | grep LANDO_SERVICE_CERT | grep /frank/cert.crt
lando exec web4 -- env | grep LANDO_SERVICE_KEY | grep /bob/key.key
lando exec web5 -- env | grep LANDO_SERVICE_CERT || echo $? | grep 1
lando exec web5 -- env | grep LANDO_SERVICE_KEY || echo $? | grep 1

# Should have certs and ancillary files in the correct places
lando exec web -- bash -c "cat \"\$LANDO_SERVICE_CERT\""
lando exec web -- bash -c "cat \"\$LANDO_SERVICE_KEY\""
lando exec web -- cat /certs/cert.crt
lando exec web -- cat /certs/cert.key
lando exec web -- cat /certs/cert.pem
lando exec web -- cat /certs/server.crt
lando exec web -- cat /certs/server.key
lando exec web2 -- cat "\$LANDO_SERVICE_CERT"
lando exec web2 -- cat "\$LANDO_SERVICE_KEY"
lando exec web3 -- cat "\$LANDO_SERVICE_CERT"
lando exec web3 -- cat "\$LANDO_SERVICE_KEY"
lando exec web4 -- cat "\$LANDO_SERVICE_KEY"
lando exec web4 -- cat "\$LANDO_SERVICE_CERT"

# Should also have certs in the default locations
lando exec web -- cat /certs/cert.crt
lando exec web -- cat /certs/cert.key
lando exec web -- cat /certs/cert.pem
lando exec web -- cat /certs/server.crt
lando exec web -- cat /certs/server.key
lando exec web2 -- cat /etc/lando/certs/cert.crt
lando exec web2 -- cat /etc/lando/certs/cert.key
lando exec web3 -- cat /etc/lando/certs/cert.crt
lando exec web3 -- cat /etc/lando/certs/cert.key
lando exec web4 -- cat /etc/lando/certs/cert.crt
lando exec web4 -- cat /etc/lando/certs/cert.key

# Should not generate certs if certs is disable-y
lando exec web5 -- ls -lsa /etc/lando/certs || echo $? | grep 2

# Should have the correct cert issuer
lando certinfo | grep Issuer | grep "Lando Development CA"
lando certinfo --service web2 | grep Issuer | grep "Lando Development CA"
lando certinfo --service web3 | grep Issuer | grep "Lando Development CA"
lando certinfo --service web4 | grep Issuer | grep "Lando Development CA"

# Should have the correct cert SANS
lando certinfo | grep DNS | grep -w localhost
lando certinfo | grep DNS | grep -w web.landocerts.internal
lando certinfo | grep DNS | grep -w web
lando certinfo | grep "IP Address" | grep 127.0.0.1
lando certinfo --service web2 | grep DNS | grep -w localhost
lando certinfo --service web2 | grep DNS | grep -w web2.lndo.site
lando certinfo --service web2 | grep DNS | grep -w web2.landocerts.internal
lando certinfo --service web2 | grep DNS | grep -w web2
lando certinfo --service web2 | grep "IP Address" | grep 127.0.0.1
lando certinfo --service web3 | grep DNS | grep -w vibes.rising
lando certinfo --service web3 | grep DNS | grep -w localhost
lando certinfo --service web3 | grep DNS | grep -w web3.landocerts.internal
lando certinfo --service web3 | grep DNS | grep -w web3
lando certinfo --service web3 | grep "IP Address" | grep 127.0.0.1
lando certinfo --service web4 | grep DNS | grep -w localhost
lando certinfo --service web4 | grep DNS | grep -w web4.landocerts.internal
lando certinfo --service web4 | grep DNS | grep -w web4
lando certinfo --service web4 | grep "IP Address" | grep 127.0.0.1

# Should be able to access over https from other lando services
lando curl https://web:8443
lando curl https://web2:8443
lando curl https://web3:8443
lando curl https://web4:8443
```

## Destroy tests

```bash
# Should destroy and poweroff
lando destroy -y
lando poweroff
```
