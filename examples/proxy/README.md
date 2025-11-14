# Proxy Example

This example exists primarily to test the following documentation:

* [Proxy](https://docs.devwithlando.io/config/proxy.html)

See the [Landofiles](https://docs.devwithlando.io/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should start up the proxy container
docker ps | grep landoproxyhyperion5000gandalfedition

# Should run the correct version of traefik
docker exec landoproxyhyperion5000gandalfedition_proxy_1 traefik version | grep Version | grep "2.11.31"

# Should return 404 when no route is found
curl -s -o /dev/null -I -w "%{http_code}" idonotexist.lndo.site | grep 404

# Should return 200 for all proxied domains
curl -s -o /dev/null -I -w "%{http_code}" http://web3.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lando-proxy.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://sub.lando-proxy.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://another-way-to-eighty.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://l337.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lando4.lndo.site | grep 200

# Should only work over http unless service has certs to use
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.protocols" }}' landoproxy_web_1 | grep -w http
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.has-certs" }}' landoproxy_web_1 | grep -w "true" || echo $? | grep 1
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.protocols" }}' landoproxy_web3_1 | grep -w "http,https"
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.has-certs" }}' landoproxy_web3_1 | grep -w "true"
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.protocols" }}' landoproxy_l337_1 | grep -w http
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.has-certs" }}' landoproxy_l337_1 | grep -w "true" || echo $? | grep 1
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.protocols" }}' landoproxy_web5_1 | grep -w http
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.has-certs" }}' landoproxy_web5_1 | grep -w "true" || echo $? | grep 1
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.protocols" }}' landoproxy_web4_1 | grep -w "http,https"
docker inspect --format='{{ index .Config.Labels "dev.lando.proxy.has-certs" }}' landoproxy_web4_1 | grep -w "true"

# Should also work over https if ssl is true and we have certs
curl -s -o /dev/null -Ik -w "%{http_code}" https://web3.lndo.site | grep 200
curl -s -o /dev/null -Ik -w "%{http_code}" https://lando4.lndo.site | grep 200
lando info -s web3 | grep hasCerts | grep true
lando exec web4 -- cat \$LANDO_SERVICE_CERT
lando exec web4 -- env | grep LANDO_SERVICE_CERT | grep /certs/cert.crt

# Should route to a different port if specified
curl -s -o /dev/null -I -w "%{http_code}" http://another-way-to-eighty.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://web3.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lets.combine.really.lndo.site/everything/for-real | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lets.combine.things.lndo.site/everything/for-real | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://l337.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lando4.lndo.site | grep 200
lando exec php --user root -- curl -s -o /dev/null -I -w "%{http_code}" http://web3:8080 | grep 200
lando exec php --user root -- curl -s -o /dev/null -I -w "%{http_code}" http://l337:8888 | grep 200
lando exec php --user root -- curl -s -o /dev/null -I -w "%{http_code}" https://web4:8443 | grep 200

# Should handle wildcard entries
curl -s -o /dev/null -I -w "%{http_code}" http://thiscouldbeanything-lando-proxy.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://wild.socouldthis.lando-proxy.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://give.me.lots.lndo.site/more/subs | grep 200

# Should handle object proxy format
curl -s -o /dev/null -I -w "%{http_code}" http://web5.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://object-format.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://object-format.lndo.site/test | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://headers.l337.lndo.site | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lando4.lndo.site | grep 200

# Should handle sites in subdirectories
curl -s -o /dev/null -I -w "%{http_code}" http://lando-proxy.lndo.site/api | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lets.see.what.happens.in.a.lndo.site/subdir | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://or.in.a.deeper.lndo.site/subdirectory/tree/ | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://lets.combine.really.lndo.site/everything/for-real | grep 200
curl -s -o /dev/null -I -w "%{http_code}" http://give.me.lots.lndo.site/more/subs | grep 200
curl http://web3.lndo.site/actually-web-2 | grep "Welcome to nginx!"

# Should load in custom middleware if specified
curl http://object-format.lndo.site | grep X-Lando-Test | grep on
curl -I http://headers.l337.lndo.site | grep X-Lando-Test | grep on
curl -k https://object-format.lndo.site | grep X-Lando-Test | grep on
curl -k https://object-format.lndo.site | grep X-Lando-Test-Ssl | grep on

# Should only load secure middleware for https
curl http://object-format.lndo.site | grep X-Lando-Test-Ssl || echo $? | grep 1
curl -k https://object-format.lndo.site | grep X-Lando-Test-Ssl | grep on

# Should generate a default certs config file and put it in the right place
docker exec landoproxyhyperion5000gandalfedition_proxy_1 cat /proxy_config/default-certs.yaml | grep certFile | grep /certs/cert.crt
docker exec landoproxyhyperion5000gandalfedition_proxy_1 cat /proxy_config/default-certs.yaml | grep keyFile | grep /certs/cert.key

# Should generate proxy cert files and move them into the right location as needed
docker exec landoproxy_web3_1 cat /proxy_config/web3.landoproxy.yaml| grep certFile | grep "/lando/certs/web3.landoproxy.crt"
docker exec landoproxy_web3_1 cat /proxy_config/web3.landoproxy.yaml| grep keyFile | grep "/lando/certs/web3.landoproxy.key"
lando exec web4 -- cat \$LANDO_SERVICE_CERT
lando exec web4 -- env | grep LANDO_SERVICE_CERT | grep /certs/cert.crt
lando exec web4 -- cat \$LANDO_SERVICE_KEY
lando exec web4 -- env | grep LANDO_SERVICE_KEY | grep /certs/cert.key

# Should succcesfully merge same-service same-hostname-pathname routes together correctly
lando exec php -- curl -sI http://lando-proxy.lndo.site | grep -i "X-Lando-Merge" | grep picard
lando exec php -- curl -sI http://lando-proxy.lndo.site | grep -i "X-Lando-Merge-Xo" | grep riker

# Should remove proxy entries when removed from the landofile and rebuild
cp -rf .lando.yml .lando.old.yml
cp -rf .lando.stripped.yml .lando.yml
lando rebuild -y | grep sub.lando-proxy.lndo.site || echo $? | grep 1
docker inspect --format='{{ index .Config.Labels "traefik.http.routers.b6735d503ac33b70087610e0c8b0074439bbb51e.rule" }}' landoproxy_web_1  | grep sub.lando-proxy.lndo.site || echo $? | grep 1
cp -rf .lando.old.yml .lando.yml

# Should alias proxy addresses to the proxy container
docker inspect --format '{{range .NetworkSettings.Networks}}{{if .Aliases}}{{.Aliases}}{{else}}[No aliases]{{end}}{{"\n"}}{{end}}' landoproxyhyperion5000gandalfedition_proxy_1 | grep lando-proxy.lndo.site
docker inspect --format '{{range .NetworkSettings.Networks}}{{if .Aliases}}{{.Aliases}}{{else}}[No aliases]{{end}}{{"\n"}}{{end}}' landoproxyhyperion5000gandalfedition_proxy_1 | grep frank.bob.joe
docker inspect --format '{{range .NetworkSettings.Networks}}{{if .Aliases}}{{.Aliases}}{{else}}[No aliases]{{end}}{{"\n"}}{{end}}' landoproxyhyperion5000gandalfedition_proxy_1 | grep object-format.lndo.site
docker inspect --format '{{range .NetworkSettings.Networks}}{{if .Aliases}}{{.Aliases}}{{else}}[No aliases]{{end}}{{"\n"}}{{end}}' landoproxyhyperion5000gandalfedition_proxy_1 | grep web5.lndo.site
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
```
