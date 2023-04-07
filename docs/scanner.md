---
title: Scanner
description: Lando services are a curated set of Docker containers like php, apache, node, mysql that are stupid easy to use but also as configurable as any other Docker image.
---

# Scanner

Lando will automatically try to real-time scan all `localhost` and `proxy` URLs _as_ your app starts up. We do this to:

1. Provide some immediate feedback to the user regarding the health of their application and the routing that Lando has set up for it
2. Help compile first-run application caches behind the scenes to improve initial loaded-in-browser speed

The results of the scan will be coded:

* <Badge type="success" text="GREEN" vertical="middle" /> - Scan passed and you are good to go!
* <Badge type="warning" text="YELLOW" vertical="middle" /> - Scan was skipped or not attempted
* <Badge type="danger" text="RED" vertical="middle" /> - [ComScan](https://www.youtube.com/watch?v=aV2DLkDPwM8&t=18s) has detected there *may* be a problem with your networking, routing or application

By default the scanner will request `/` for each URL a service exposes. It will error for any non `2XX` code and it will retry 25 times with a slight backoff per retry. It _will not_ follow redirects.

We realize there are legitimate use cases where you may not want the above behavior. For example you may have purposefully set up your application to emit a naughty status code. For these use cases, see the configuration options below:

::: tip NEW FEATURES!
Please note that the vast majority of these configuration options were added in [Lando 3.14.0](https://github.com/lando/lando/releases/tag/v3.14.0). So if they are not working for you we recommend you first update to the latest Lando.
:::

## Skipping

If you would like to bypass scanning altogether then just set `scanner` to `false`. This will cause the scan to immediately pass. The URL will show up as yellow do denote it has been skipped.

```yaml
services:
  myservice:
    type: apache
    scanner: false
```

## Adding OK codes

Some applications start up serving alternate non `2XX` response codes.

For example, some PHP frameworks will serve a `404` page by default. If you are in a similar situation you can explicitly add additional codes that Lando will interpret as "OK".

```yaml
services:
  myservice:
    type: apache
    scanner:
      okCodes:
        - 404
        - 444
```

## Scanning an alternate path

Similarly you may have a designated "healthcheck" path that you'd prefer to scan instead of `/`. Not a problem:

```yaml
services:
  myservice:
    type: apache
    scanner:
      path: /ping
```

## Other options

You can also change the amount of time to wait for a request, the number of retries and the number of redirects to follow.

```yaml
services:
  myservice:
    type: apache
    scanner:
      maxRedirects: 0
      timeout: 1000
      retry: 10
```

## Using the legacy scanner

You can also elect to use the legacy pre-3.14.0 scanner by editing the Lando [global configuration](./global.md).

**config.yml**

```yaml
scanner: legacy
```

Alternatively you can use the legacy scanner by setting the environment variable `LANDO_SCANNER` to `legacy`. Here is a use-at-start example:

```bash:no-line-numbers
LANDO_SCANNER=legacy lando start
```

You can see whether the legacy scanner is being used with `lando config` and looking for the `scanner` key.

Note that the key will only be set if you elected to use the `legacy` scanner.

```bash:no-line-numbers
LANDO_SCANNER=legacy lando config --path scanner
```
