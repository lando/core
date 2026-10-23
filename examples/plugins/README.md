# Plugins Example

This example exists primarily to test the following documentation:

* [Plugins](https://docs.lando.dev/core/v3/plugins.html)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
docker rm --force lando-plugin-registry 2>/dev/null || true
docker run -d --name lando-plugin-registry -p 4873:4873 \
  --volume "$PWD/verdaccio.yml:/verdaccio/conf/config.yaml" \
  verdaccio/verdaccio:6
until curl --silent --fail http://localhost:4873/-/ping; do sleep 1; done
REGISTRY_TOKEN=$(curl --silent --fail \
  --user lando:lando-test \
  --request PUT \
  --header "content-type: application/json" \
  --data '{"name":"lando","password":"lando-test","email":"lando@example.com","type":"user"}' \
  http://localhost:4873/-/user/org.couchdb.user:lando \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
npm publish ./registry-test-plugin \
  --access public \
  --registry http://localhost:4873 \
  --//localhost:4873/:_authToken="$REGISTRY_TOKEN"
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Should load plugins from pluginDirs
lando stuff | grep "I WORKED"

# Should load plugins specified in landofile
lando stuff2 | grep "I WORKED"

# Should be able to add a public plugin via a registry string.
lando config | grep -qv "plugins/@lando/php"
lando plugin-add "@lando/php"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from local directory.
wget https://github.com/lando/php/archive/refs/heads/main.tar.gz && tar -xf main.tar.gz
lando plugin-add "./php-main"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from a remote tarball.
lando config | grep -qv "plugins/@lando/php"
lando plugin-add "https://github.com/lando/php/archive/refs/heads/main.tar.gz"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from a git string `lando/plugin#branch`
lando plugin-add "lando/php#main"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should be able to add a plugin from a git repo URL.
lando plugin-add "https://github.com/lando/php.git"
lando config | grep -q "plugins/@lando/php"
lando plugin-remove "@lando/php"
lando config | grep -qv "plugins/@lando/php"

# Should execute `lando plugin-login` against an isolated registry
lando plugin-login --registry "http://localhost:4873" --password "lando-test" --username "lando" --scope "lando::registry=http://localhost:4873"

# Should be able to add and remove a private plugin via a registry string.
lando config | grep -qv "plugins/@lando/lando-plugin-test"
lando plugin-add "@lando/lando-plugin-test"
lando config | grep -q "plugins/@lando/lando-plugin-test"
lando plugin-remove "@lando/lando-plugin-test"
lando config | grep -qv "plugins/@lando/lando-plugin-test"
```

# Destroy tests

```bash
# Should destroy successfully
lando destroy -y
lando poweroff
docker rm --force lando-plugin-registry
```
