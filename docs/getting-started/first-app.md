---
description: Learn how to boot up and initialize your first project for usage with Lando with a Hello World!, Drupal 9 and Pantheon example.
next:
  text: Lando 101
  link: /lando-101
---

# Starting your first app

Now that you've got Lando installed you should try a few easy examples before you _get into it_.

## Hello World!

```bash
# Create a new directory for this example and enter it
mkdir hello && cd hello

# And add a nice homepage
echo "<h1>Lando says hellooo what have we here?</h1>" > index.html

# Initialize a basic LAMP stack using the cwd as the source
lando init \
  --source cwd \
  --recipe lamp \
  --webroot . \
  --name hello-lando

# Check out the Landofile it created for you
cat .lando.yml

# Start it up
lando start

# Check out the commands you can run
lando

# Visit the site in your browser: https://hello-lando.lndo.site

# Destroy the site
lando destroy -y
```

## Vanilla Drupal 9

You can also pull in code from an external archive (or git repo/GitHub) to seed a new project.

```bash
# Create a new directory for this example and enter it
mkdir drupal9 && cd drupal9

# Initialize a new lando drupal using vanilla Drupal 9
lando init \
  --source remote \
  --remote-url https://www.drupal.org/download-latest/tar.gz \
  --remote-options="--strip-components 1" \
  --recipe drupal9 \
  --webroot . \
  --name hello-drupal9

# Start the site
lando start

# Install a site local drush
lando composer require drush/drush

# Install drupal
lando drush site:install --db-url=mysql://drupal9:drupal9@database/drupal9 -y

# Check out your new site! https://hello-drupal9.lndo.site

# Log in as admin with Drush
lando drush uli -l https://hello-drupal9.lndo.site

# Destroy it
lando destroy -y
```

## From Pantheon

If you have a [Pantheon](https://pantheon.io) account you can clone a site locally.

```bash
# Create a new directory for this example and enter it
mkdir pantheon && cd pantheon

# Go through interactive prompts to get your site from pantheon
lando init --source pantheon

# Start it up
lando start

# Import your database and files
lando pull
```

## More

Continue your journey with our brief [Lando 101](/lando-101) course.
