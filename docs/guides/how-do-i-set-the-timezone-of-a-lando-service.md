---
title: How do I set the timezone of a Lando service?
description: Set the timezone of a Lando service for testing time sensitive operations
guide: true

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

# How do I set the timezone of a Lando service?

If you need to set the timezone of a Lando service here is how! Just symlink the appropriate timezone you need in a `run_as_root` build step. Here is an example `.lando.yml` file.

```yaml
name: timezone
recipe: lemp
config:
  webroot: .

services:
  appserver:
    run_as_root:
      - ln -snf /usr/share/zoneinfo/America/New_York /etc/localtime
      - echo "America/New_York" > /etc/timezone
```

Just copy the `run_as_root` section into your `services` key for any service you need it for, i.e. `appserver`, `database`, or whatever service you need to set. Be sure to swap out `America/New_York` to the timezone that you need.

::: warning Tested on Debian only
Note that we test this on Debian flavored services so these instructions might differ slightly or be unapplicable for non-Debian services.
:::

Then run a rebuild:

```bash
lando rebuild -y
```

and you'll have the timezone set in those services.
