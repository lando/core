
#  March 27, 2024 - Lando Contributor Meeting

If you are interested in contributing then [go here](./index.md#getting-started).

<YouTube id="PmUahn-J-To" />

## Links

* [Full Meeting Recording](https://drive.google.com/file/d/1a4953iNuJwqZICYfkjrxzG0YhIsfCr1U/view?userstoinvite=none)
* [Meeting Transcript](https://docs.google.com/document/d/1R5GW9-gwrw_tYaCd8GDu-9EN8FLk845yeYcdglHph2s)

## Introduction

* Note that we're recording!
* [Fill out the Google Form](https://docs.google.com/forms/d/1vdDhmHqg7lS540eCrMR4MQO6DT4nfAsl-z8JRcnnmSI/viewform?edit_requested=true)

## Lando Updates

### Development Update

* Lando started as a mono-repo. To help people contribute, it's been broken up into constituent pieces. Pretty close to being complete; 3.21.x-beta has been accomplishing that.
* Lando org has ~80 different repos.
* Now we can bring contributors onboard, create teams focused on smaller areas, have recurring meetings.

### Governance

* Lando is a  free/open-source project, but it's still under the auspices of a for-profit entity.
* We're examining the process of moving Lando into a non-profit entity; definitely very interested in moving that direction.

## Teams

### Devops

* GitHub Actions, installer scripts (kudos to Aaron Feledy for working on Windows script), Homebrew scripts, etc.
* Bi-weekly meetings

### Plugins

* Most folks are interested in PHP-related plugins (PHP, Drupal, WordPress, Pantheon, etc.)
* This is where we need the MOST immediate help!
* A lot of this is  bug fixing, responding to users.
* We'll start with a general meeting, should be federating out the meetings as we get more contributors. Probably first division will be "PHP-related Plugins" and a "General"
* We're close to releasing a backport of the Lando v4 service into Lando v3; there will be a big chunk of work to port all the services/recipes.
* Bi-weekly meetings

### Core

* Right now this is Pirog's domain until things are "set up". Get back in the code dungeon Mike.
* In the future this would cover the `core`, `core-next`, `cli` repos.

### General

* Governance: right now we follow the "benevolent dictator" model, but as we engage more contributors we should start evolving the governance structure.
* Maintainers: we'll need people to take ownership over maintaining repos.
* Initial meeting, probably monthly meetings afterwards.

## Q+A

### Is documentation the responsibility of the people working on the plugin?

Yes, docs are in the code repositories for each plugin. Effectively each plugin has its own docs site. However, there are some general docs repos (`lando/docs`) that have some overarching material, so those may need some specific contributors in the future. For now, the priority is making sure people who are focused on a given repo are maintaining its docs. Docs are fairly standardized due to a common Vitepress (tool used for generating the docs) theme.

In the future, we'll have to see if we want to enforce consistent styling (Vitepress theme) over docs for non-Lando maintained plugins?

### Is the `#contributors` channel in Slack the best place to still hang out for real time chat?

Yes! In the future we might move off Slack, but that channel is still where we have chatter over contribution.

* **Q: **Any interest in a Ruby on Rails plugin?
    * **A: **One of the goals of Lando v4 is to make plugin creation easier, waiting for v4 has been one of the reasons we haven't been actively extending to make new services. We're hoping that more people will make their own services in v4, encourage a wider ecosystem instead of having a few maintainers need to make/maintain everything. We're limited by our knowledge as developers.

* **Q: **What's the level of commitment expected if you join a team? How do we make sure we have continuity if a main maintainer who has been doing a bunch of work then needs to drop off?
    * **A: **We know it's volunteer work on a free and open source project, so we're not expecting life-or-death commitment. We're expecting good communication…if you've been a key contributor, your teammates will appreciate you letting them know that you're having to take a step back so they can fill the gap.

* **Q: **Is there an example plugin repo that can be used for inspiration to create a new repo, or should we just look at existing plugins?
    * **A: **This current doesn't exist (there was a proto-attempt at this for v3) but it will definitely exist for Lando v4. Should have example files, yml config, workflow (GitHub Actions) files for testing/deploying, docs, etc.

* **Q: **Specific tooling for project management?
    * **A: **We're using GitHub Issues (and GitHub Projects) right now, but in the future team leaders (project maintainers) could choose something different for the sub-projects. Probably will highly recommend people stay on the GitHub stack, since issues have a tendency to come into the incorrect repo (a PHP issue may get posted in the Drupal recipe first, then get moved over), so having them on the same platform is handy.

* **Q:** Do new plugins get added to the standardized lando project or do you just create your own repo?  As you can imagine, if everybody starts
forking everywhere, it will be difficult to locate plugins.
    * **A: **We'll be keeping distinctions between "Lando maintained" first-party plugins and third-party plugins. To add a plugin into the plugins listing on lando.dev you'll need to submit at least a pull request, so there will be some management of what is officially listed. So visibility is gated, but power to create plugins won't be.

* **Q: **Is it time to move to Discord soon?
    * **A: **We're inclined to move that direction, but it's mostly a matter of time. As organizers we have limited time (could be a good contributor task!), plus we'll need to keep both Slack/Discord open for a while, since we have 3K+ users on Slack currently.

* **Q:** How would a 3rd party plugin be defined?  Would the official lando project have a reference to someone's github plugin project?  In other words, how would 3rd party plugins be searchable?
    * **A: **Independent plugins could just be found via Google Search…nothing stops independent creation/discovery of plugins.
    * We have an official plugin registry on the docs now: [https://docs.lando.dev/plugins](https://docs.lando.dev/plugins)
    * Getting on that registry depends on some metadata (which will be in the plugin template), if you want your plugin in the ecosystem you'd make a PR to the `lando/docs` with the appropriate markdown file describing your plugin.

* **Q:** Is there anything specific that I should focus on learning, to contribute best?
    * **A: **Javascript/Node are the most relevant languages. During contributor meetings we'll help folks get setup with development tools/environments.
    * Right now if you're not familiar with Javascript, we'd discourage you from diving headfirst into Lando v3 and waiting for v4 to really learn more. HOWEVER, you can be helpful in some of the DevOps tasks that are important to helping with distribution, installation, etc, most of which is bash-based or GitHub Actions.
    * VitePress theme for the docs should also be not changing with v4.
