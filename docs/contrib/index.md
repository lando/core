---
description: Learn how to contribute to Lando.
---

# Getting Involved

::: center
![Lando Alliance](https://lando.dev/images/lando-alliance.png)
:::

If you are interested in helping out with the Lando project, then you've come to the _**right place!**_ We are looking for people to help out in any of the capacities as follows:

::: half CODER
Work on making and supporting Lando by touching code, docs, issues, DevOps or helping out in our Slack community channel
:::

::: half EVANGELIST
Present, train or speak about Lando at various meetups, camps and conferences and generally spread the good word across the galaxy
:::

::: half SPONSOR
Give the dollars and get exclusive benefits
:::

::: half CONTENT
Generate useful content like docs, guides, videos, tutorials, lessons, etc
:::

::: half HELPER
Providing community support on GitHub, Slack, email, X/Twitter, etc
:::

::: half GOVERNANCE
Help us run both the actual project and maintain the repos
:::

**If any of the above sound up your alley, then please proceed to [getting started](#getting-started).** If not than we ask you at least go over to [GitHub](https://github.com/lando/lando) and give us a star :star:.

## Getting Started

To get started you need to do _at least_ one of the below but we **HIGHLY RECOMMEND** you just do them all:

1. [Join the contributors mailing list](https://dev.us12.list-manage.com/subscribe?u=59874b4d6910fa65e724a4648&id=613837077f)
2. [Join the #contributors channel on Slack](#slack)
3. [Complete our contributor Google Form](https://docs.google.com/forms/d/1vdDhmHqg7lS540eCrMR4MQO6DT4nfAsl-z8JRcnnmSI)
4. [Create, flag and/or assign some issues you are interested in](#choosing-an-issue)
5. [Come to your first contributor meeting](#meetings)

## Comms

These are the channels we usually use for communication.

### GitHub

GitHub serves as the mechanism for all Lando code, issue reporting/tracking and project management.

While the [Lando Organization](https://github.com/lando) serves as the starting point for all Lando projects, most collaboration is going to occur in the core [Lando Project](https://github.com/lando/lando) and its [issue queue](https://github.com/lando/lando/issues).

### Slack

Slack serves as the mechanism for Lando support and contributor coordination. You can join the Lando slack org via [LaunchPass](https://www.launchpass.com/devwithlando). By default, you will be added to the **#community** channel which is our free and open community support channe but you should also join **#contributors**.

There are also some other channels you can join at your discretion:

  * **#administrators** - For those who help administer and coordinate Lando
  * **#bloggers** - For those contributing case studies, training materials and other content to the blog
  * **#evangelists** - For those looking to evangelize Lando at meetups, events, camps, etc
  * **#guiders** - For those writing helpful Lando guides and tutorials
  * **#upsellers** - For those helping to help sell Lando sponsorships, support and services
  * **#social** - For suggesting social content for Lando
  * **#kalabox** - For legacy Kalabox community support

Join some channels and say hi!

### X/Twitter

X/Twitter is our primary outreach and social channel. If you are fearless, then [follow us](https://twitter.com/devwithlando) and get involved in the conversation!

## Choosing an Issue

If you don't already have a GitHub issue or two in mind you can go through them in a few different ways:

* [By maintainer projects](https://github.com/orgs/lando/projects)
* [By individual repo](https://github.com/orgs/lando/repositories)
* [By all issues in the org](https://github.com/issues?q=is:open+is:issue+org:lando)

If you don't see one you can also [create your own](https://github.com/lando/lando/issues/new/choose). However once you have an issue or two in mind you will want to do possibly both of the below:

* **Label the issue with <Badge type="flag">flag</Badge>** - This will add it into the relevant contributor project board so a maintainer knows to discuss it in their next meeting.
* **Assign the issue to yourself** - If it's an issue you want to take on then [assign it](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/assigning-issues-and-pull-requests-to-other-github-users) to yourself.

If you cannot label or assign an issue then we probably need to invite you to collaborate. To do that jump in the `#contributors` channel in Slack, post your issue and indicate you want to self-assign it and a maintainer will send you an invite.

Note that permissions are given on a per-repo basis so you'll need to do this once for every repo you want to work on.

## Meetings

We are currently meeting for three dedicated purposes: `Plugins`, `DevOps` and `Governance & Maintainership`, here are the next meetings:

<ul>
  <li
    v-for="meeting in getMeetings(meetings)"
    :key="meeting.first"
  >
    <strong>{{ meeting.text }}</strong> - {{ meeting.nmPretty }}
  </li>
</ul>

Make sure you [join the mailing list](https://dev.us12.list-manage.com/subscribe?u=59874b4d6910fa65e724a4648&id=613837077f) and/or [#contributors](#slack) channel in our Slack to get invited/access to the meetings.

## Archives

* [March 27, 2024 - Kickoff Meeting](./kickoff-meeting-3-27-2024.md)

We also put _all_ the raw data [over here](https://drive.google.com/drive/folders/1O9kO9or7vRRMUfb4L88K0yWTE6uZ5jwd) in Google Drive if you want to sift through things.

<script setup>

const now = Date.now();
const week = 604800000;
const delay = 7200000;

// meeting start dates in UTC ms timestamps
const meetings = [
  {text: 'Plugins', first: 1712073600000, period: 2},
  {text: 'DevOps', first: 1712678400000, period: 2},
  {text: 'Governance & Maintainership'},
];

const getMeetings = (items = meetings) => {
  return meetings
    .map(item => {
      item.nm = item.first ? new Date(nextMeeting(item.first, item.period)) : undefined;
      item.nmPretty = item.nm ? prettyDate(item.nm) : 'TBD';
      return item;
    })
    .sort((a, b) => {
      if (!a.first) return 1;
      else return b.first - a.first;
    });
}

const nextMeeting = (first, period = 2) => {
  // if first meeting is in the future then just return
  if (now - first < 0) return first;
  // otherwise give us the next meeting but give a delay of two hours
  const multiplier = Math.ceil((((now - first) / (week * period)) - delay / (week * period)));
  // return the next meeting
  return first + (multiplier * period * week);
};

const prettyDate = (
  date = new Date(),
  {
    weekday = 'long',
    year = 'numeric',
    month = 'long',
    day = 'numeric',
    timeZoneName = 'short'
  } = {}) => {
  return `${date.toLocaleDateString(undefined, {weekday, year, month, day})} @ ${date.toLocaleTimeString(undefined, {timeZoneName})}`;
};


</script>

<style>
.VPBadge.flag {
  background-color: rgb(219, 39, 119);
  color: #fff;
  border-width: 1px;
  border-style: solid;
  border-color: rgba(208, 215, 222, 0.7);
  font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 12px;
  font-weight: 800;
}
</style>
