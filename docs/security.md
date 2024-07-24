---
title: Security
description: Lando uses its own, or a configurable, certificate authority to SSL/TLS secure all its local traffic, removing the need of local cert bypass flags or annoying browser warnings.
---

# Security

Lando tries to find the fine line between good security and good user experience. **SPOILER ALERT:** It ain't easy.

The things we do by default and how you can modify them to your needs are shown below:

[[toc]]

## Exposure

Lando will bind all exposed services to `127.0.0.1` for security reasons. This means your services are *only* available to your machine. You can alter this behavior in one of two ways.

### 1. Changing the bind address

You can modify the Lando [global config](./global.md) to change the default bind address:

```yaml
# Bind my exposes services to all intefaces
bindAddress: "0.0.0.0"
```

```yaml
# Bind my exposes services to a single IP
bindAddress: "10.0.1.1"
```

You will then need to `lando rebuild` your service for the changes to take effect.

### 2. Overridding a particular service

If you [override](./services/lando.md) a particular service and specify the external IP then Lando will honor that choice and not force override with the `bindAddress`.

```yaml
# This will find a random port on 0.0.0.0
# and route it to port 80 on your appsrver service
services:
  appserver:
    overrides:
      ports:
        - "0.0.0.0::80"
```

Note that there are security implications to both of the above and it is not recommended you do this.

## Certificates

Lando uses its own Certificate Authority to sign the certs for each service and to ensure that these certs are trusted on our [internal Lando network](./networking.md).

Where they live in each service will differ depending on the service API version:

::: code-group

```sh [API 3]
/certs
|-- cert.crt
|-- cert.key
|-- cert.pem
```

```sh [API 4]
/etc/lando/certs
|-- cert.crt
|-- cert.key
|-- cert.pem
```

:::

You can also inspect the `LANDO_SERVICE_CERT` and `LANDO_SERVICE_KEY` envvars to get the cert locations.

```sh
lando exec web -- env | grep LANDO_SERVICE_CERT
lando exec web -- env | grep LANDO_SERVICE_KEY
```

Note that in API 3 services you will need to [enable SSL](http://localhost:5173/core/v3/services/lando.html#ssl) to get certs. API 4 services will generate certs by default.

## Trusting the CA

We will also automatically trust the generated Lando Development CA during setup.

If you missed this or cancelled it for whatever reason you can run [`lando setup --skip-common-plugins`](https://docs.lando.dev/cli/setup.html) and Lando will try to install it again.

Note that Lando will only add trust to the system store so you may need to trust the CA in additional places. To do so please continue reading.

::: warning You may need to destroy the proxy container and rebuild your app!
If you've tried to trust the certificate but are still seeing browser warnings you may need to remove the proxy with `docker rm -f landoproxyhyperion5000gandalfedition_proxy_1` and then `lando rebuild` your app.
:::

The default Lando CA should be located at `~/.lando/certs/LandoCA.crt`. If you don't see the cert there, try starting up an app as this will generate the CA if its not already there.

Note that if you change the [global config](./global.md), you may have differently named certs and you will likely need to trust these new certs and rebuild your apps for them to propagate correctly. Running `lando config --path caCert` can help in these situations.

That all said, once you've located the correct cert, you can add or remove it manually with the relevant commands below.

### macOS

```zsh
# Add the Lando CA
security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db ~/.lando/certs/LandoCA.crt

# Remove Lando CA
security delete-certificate -c "Lando Development CA"
```

### Windows

```powershell
# Add the Lando CA
certutil -f -user -addstore "ROOT" C:\Users\ME\.lando\certs\LandoCA.crt

# Remove Lando CA
certutil -delstore "ROOT" serial-number-hex
```

Note that if you want to trust the cert and are using Lando within a Linux environment on WSL2, you'll need to use the path to the cert used by that Linux environment. Ex:

```sh
certutil -addstore -f "ROOT" \\wsl.localhost\LINUX-DISTRIBUTION\home\LINUX-USER\.lando\certs\LandoCA.crt
```

### Debian

```sh
# Add the Lando CA
sudo cp -r ~/.lando/certs/LandoCA.crt /usr/local/share/ca-certificates/LandoCA.crt
sudo update-ca-certificates

# Remove Lando CA
sudo rm -f /usr/local/share/ca-certificates/LandoCA.crt
sudo update-ca-certificates --fresh
```

### Arch

```sh
# Add the Lando CA
sudo trust anchor ~/.lando/certs/LandoCA.crt

# Remove Lando CA
sudo trust anchor --remove ~/.lando/certs/LandoCA.crt
```

### Firefox

Firefox users may still see browser warnings after performing the steps above. Firefox maintains its own certificate store and does not, by default, use the operating system's certificate store.

To allow Firefox to use the operating system's certificate store, the **security.enterprise_roots.enabled** setting must be set to **true**.

* In Firefox, type `about:config` in the address bar
* If prompted, accept any warnings
* Search for `security.enterprise_roots.enabled`
* Set the value to `true`

Or you can [manually import a trusted CA](https://support.mozilla.org/en-US/kb/setting-certificate-authorities-firefox) to the Firefox store.

### Chrome

Check out [Step 2](https://support.google.com/chrome/a/answer/6342302?hl=en).

## SSH Keys

We also will inject SSH keys into each service but this is [highly configurable](./ssh.md).
