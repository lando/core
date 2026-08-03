# Docker Desktop Smoke Tests

This example verifies a tiny LAMP application and its HTTPS proxy against the default Docker Desktop version on macOS and Windows.

## Start up tests

```bash
# Should start an app with the default Docker Desktop version
lando poweroff
lando start
```

## Verification commands

```bash
# Should discover the running application and database services
lando info --service appserver
lando info --service database

# Should execute PHP in the application service
lando php -r "echo 'lando-php-is-working';"

# Should connect PHP to the database
lando php -r '$db = new mysqli("database", "lamp", "lamp", "lamp"); exit($db->connect_errno);'

# Should serve the application through its HTTPS proxy URL
node -e "const https = require('https'); process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; https.get('https://lando-desktop-smoke.lndo.site', response => { let body = ''; response.on('data', chunk => body += chunk); response.on('end', () => { if (response.statusCode !== 200 || !body.includes('lando-lamp-https-is-working')) process.exit(1); }); }).on('error', error => { console.error(error); process.exit(1); });"
```

## Destroy tests

```bash
# Should destroy the app and shared services
lando destroy -y
lando poweroff
```
