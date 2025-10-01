---
description: Get started spreading the word of developer liberation and salvation via Lando across the Galaxy
---

# Evangelizing

Because Lando is a free and open source project without :unicorn: money, we rely heavily on our users to spread the good word far and wide. These docs help identify some, but not all, of the ways you can evangelize and should provide you with some good starting materials.

[[toc]]

## How do I evangelize?

While you should _do you_ and evangelize in the way that best suits you, here are some things our more successful advocates do:

* Present, talk or train about Lando or Lando-adjacent materials at conference, camps, meetups, etc and to post those events at <https://lando.dev/events>.
* Retweet Lando content, tweet directly at [@devwithlando](https://twitter.com/devwithlando) or engage in local dev or DevOps related Twitter threads.
* Troll local development blog content and mention Lando in the comments, if applicable.
* Get friends, colleagues, spouses, partners, pets, grandparents, former roommates, etc. to follow us [@devwithlando](https://twitter.com/devwithlando) and [star our project on GitHub](https://github.com/lando/lando).
* Buy a Vagrant or MAMP user a :beer: and hit them with some sweet, sweet [talking points](#talking-points).

::: tip Evangelism need not be directly Lando related!
It's important to note that content, presentations and other forms of evangelism need not be directly Lando focused. Presenting on something like automated testing but using Lando to do it is great too!
:::

## Presenting

The most obvious and straightforward way to evangelize is to present about Lando or Lando-adjacent things at a meetup, camp, conference, training or other gathering.

Some helpful steps to get you started are shown below:

### Finding an event

We recommend getting in touch with local event organizers to help you get started. It's also a good idea to [join our Slack org](https://www.launchpass.com/devwithlando) and check out the **#community** and/or **#evangelists** channels. There is likely another Lando evangelist who can help you out.

Some well known places to get you started are below:

* [Drupal Events Calendar](https://www.drupal.org/community/events)
* [WordPress Event Calendar](https://central.wordcamp.org/schedule/)
* [Meetup.com](https://www.meetup.com/)

### Submitting a session, proposal or deck

Once you've found an event, the next step is usually to submit a session/proposal and/or start creating the content for your presentation, talk or training.

While you certainly can create content from scratch, we recommend you request access to this [Google Folder](https://drive.google.com/drive/folders/1ooK_NTMBuwOV0uix8O54umJGwAODL9dC) as it contains a large cache of previously submitted sessions, proposals, slide decks and training materials. It's highly likely you can fork or adapt some of these as a starting point.

We also highly encourage you to contribute your finished presentation materials back to the same Google folder. This both aids future evangelists and also serves as a record for posterity.

Before crafting your content, definitely check out the [talking points](#talking-points) so you hit on all the Lando goodness. If you want to see Lando keep winning, please insert a slide reminding people to [sponsor Lando](sponsoring.md)!

### Promotion

Promotion of your event is obviously at your own discretion but a few recommended ideas are below:

* Tweet at us [@devwithlando](https://twitter.com/devwithlando).
* Post on Facebook, LinkedIn, etc.
* Send to a periodical/newsletter such as [The Weekly Drop](https://www.theweeklydrop.com/).
* Open a PR against our [events site](https://github.com/lando/events)

If you would like to take advantage of Lando's marketing channels, just jump in the **#social** channel in our [Slack org](https://www.launchpass.com/devwithlando) and tell us what event you want us to promote!

We are always happy to retweet, send out in our newsletter, etc!

## Social Advocacy

Social advocacy, perhaps better known as _"positive trolling"_ is a great way for a small project with passionate users to multiply their reach with some simple coordination.

Our goal here is to locate places on the interwebs where we can introduce people to Lando and to then share these places with other evangelists so they can echo said recommendations and provide strength in numbers.

We also want to point out there is a pretty blurry line between flooding a medium with noise and providing a positive, backed-by-many-users recommendation about a great tool. **PLEASE DO THE LATTER.**

An example of the intended flow is shown below:

1. Evangelist notices a blog post called _Best Dev Tools of The Year_ that omits Lando.
2. Evangelist drops a comment with an intro and recommendation to use Lando.
3. Evangelist hollas at the **#social** or **#evangelists** channels in the [Lando slack](https://www.launchpass.com/devwithlando) about the post with a call to action like "Hey all! Can you believe Lando isn't mentioned here? Can a few of you lend your voice?"
4. The word is spread.

Some other obvious places rife with outreach opportunity are below:

* Onboarding documentation for a particular framework e.g. WordPress.
* Tweets or other social threads asking for local dev and dev tool recommendations.
* Hosting provider documentation that omits Lando.
* Blog content discussing dev tooling.
*

If you are interested in helping, make sure you [join our Slack org](https://www.launchpass.com/devwithlando) and check out the **#social** and/or **#evangelists** channels.

## Talking Points

Some talking points you can use in your presentations or next dinner date are shown below:

These are intended to try and convince a more-technical audience to adopt Lando. If you are interested in more business focused talking points, particularly if you are trying to convince an org to sponsor Lando, then check [these out](https://lando.dev/blog/2020/02/08/why-your-agency-should-sponsor-lando.html) instead.

### High Level

* The purpose of Lando is to liberate developers to focus on their most important work by providing a single, easy to use tool they can use on all their projects regardless of tech stack, operating system or hosting provider.
* The general idea behind Lando is to `git clone` a project, run `lando start` and get _everything_ you need to develop, test and deploy your project. This means not only the infrastructure to run your project but the tools to develop and test it as well.
* Lando is a development dependency management tool.

### Advantages

* **Speed and Scale** - Containers over VMs means each project can have its own dependencies and you can switch between them much much faster.
* **Standarization** - A single way for all your developers to interact with all your projects.
* **Parity** - Achieve parity with each project's hosting target.
* **Tooling** - Containerize tools along with services and lock down versions of things like `node` on a project to project basis. Say goodbye to things like `rvm` forever.
* **VCS** - Put your Landofile configuration in version control so it can be shared and tracked.
* **Integrations** - Integrate with hosting providers like [Pantheon](https://pantheon.io).
* **Sane defaults** - Lando will give you recommended settings out of the box but it is hyper-configurable. You can have a two line or two hundred line Landofile.

### Key Differences

* Lando is designed to run _any_ project you have.
* Lando has built in build steps and event automation.
* Lando has never raised money, and won't, so you know it's grassroots shit.
* Lando is the engine that powers other popular tools like Acquia's Dev Studio or Pantheon's Localdev.
* Lando is the culmination of over 10 years of expertise in this space.

### Docker Compose

* Lando is built on top of Docker Compose and functions as a Docker Compose abstraction layer, superset and utility.
* As a Docker Compose utility, Lando handles some of the more tedious setup like networking, SSL, proxying, etc.
* As a super set, Lando provides ways for developers to run complex commands, build steps and automation on their services without the hassle of custom Dockerfiles or long "docker exec" commands.
* As an abstraction layer, Lando vastly reduces the complexity of spinning up containers by exposing only the most relevant config for a given "service" and setting "sane defaults".
* Lando can also be overridden down to the Docker level so all its power is still available when needed.

### Data

* Over 11,000 monthly users
* 80% of developers use a recipe
* Our most popular recipes are Drupal 8, WordPress and Pantheon
* Slack community of over 1,000 developers
* Over 100 open source contributors

_This data was last updated in early 2020._

### Misc

* Lando is officially version 3. This reflects its Kalabox heritage which had two major versions.
* Lando was supposed to only be the code name for this project but it got popular too fast and the name stuck.
* Lando is the only local development solution that has [a mascot](https://www.youtube.com/watch?v=dQw4w9WgXcQ).
