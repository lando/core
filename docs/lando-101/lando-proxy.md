---
title: Lando Proxy
description: An example of using the Lando proxy key.

authors:
  - name: Team Lando
    pic: https://gravatar.com/avatar/c335f31e62b453f747f39a84240b3bbd
    link: https://twitter.com/devwithlando
updated:
  timestamp: 1594391902000

mailchimp:
  # action is required
  action: https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f
  # everything else is optional
  title: Want similar content?
  byline: Signup and we will send you a weekly blog digest of similar content to keep you satiated.
  button: Sign me up!
---

# Lando Proxy

Some `services` like `mailhog` provide an admin interface via a browser. In such cases it is convenient to assign a URL to the service container. We do so via the `proxy` key in our `.lando.yml` file.

Let's add a URL to our `mailhog` service so we can access the MailHog dashboard. Open up your Lando 101 `.lando.yml` file and add a proxy section like so:

```yaml
name: lando-101
recipe: lamp
config:
  php: 7.4
services:
  mailhog:
    type: mailhog:v1.0.0
    portforward: true
    hogfrom:
      - appserver
proxy:
  mailhog:
    - mail.lando-101.lndo.site
```

The new config being the `proxy` key which takes a `service` and the `service` gets an array of URLs in this case `- mail.lando-101.lndo.site`. You can add a URL to any service you like.

::: warning Rebuild Required
After adding a `proxy` make sure to `rebuild` the Lando 101 app.

```bash
lando rebuild -y
```
:::

After rebuilding we can now access the new `mail.lando-101.lndo.site` URL to view the MailHog dashboard.

<img src="/images/lando-101/mh.jpg" />

Using the `proxy` key in our `.lando.yml` file we can add a URL to any `service` in a Lando app! If you need to dig deeper you can read the [full proxy documentation](https://docs.lando.dev/core/v3/proxy.html).
