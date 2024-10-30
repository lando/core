import {createRequire} from 'module';

import {defineConfig} from '@lando/vitepress-theme-default-plus/config';
import {default as getBaseUrl} from '@lando/vitepress-theme-default-plus/get-base-url';

// svg
const hat = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>';
const puzzle = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" /></svg>';

const require = createRequire(import.meta.url);

// get plugin stuff
const {name, version} = require('../../package.json');
const landoPlugin = name.replace('@lando/', '');

// get baseUrl
const baseUrl = getBaseUrl();

export default defineConfig({
  title: 'Lando 3',
  description: 'Documentation',
  landoDocs: 3,
  landoPlugin,
  version,
  base: '/',
  baseUrl,
  navBaseUrl: baseUrl,
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1'}],
    ['link', {rel: 'icon', href: '/core/favicon.ico', size: 'any'}],
    ['link', {rel: 'icon', href: '/core/favicon.svg', type: 'image/svg+xml'}],
  ],
  themeConfig: {
    multiVersionBuild: {
      build: 'dev',
      satisfies: '>=3.23.0',
    },
    collections: {
      guide: {
        frontmatter: {
          collection: 'guide',
        },
        icon: hat,
        iconLink: '/guides',
        patterns: ['guides/**/*.md'],
      },
      lando101: {
        frontmatter: {
          collection: 'lando101',
        },
        icon: hat,
        iconLink: '/lando-101',
        patterns: ['lando-101/**/*.md'],
      },
      plugins: {
        frontmatter: {
          collection: 'plugins',
          layout: 'plugin',
        },
        icon: puzzle,
        iconLink: '/plugins',
        patterns: ['plugins/**/*.md'],
      },
      post: {
        frontmatter: {
          collection: 'post',
          contributors: false,
          backLink: {
            text: '<- Back to blog',
            link: '/blog',
          },
          aside: false,
          sidebar: false,
          prev: false,
          next: false,
          editLink: false,
        },
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></svg>',
        iconLink: '/blog',
        patterns: ['blog/**/*.md'],
      },
      troubleshooting: {
        frontmatter: {
          collection: 'troubleshooting',
        },
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" /></svg>',
        iconLink: '/troubleshooting',
        patterns: ['help/**/*.md', 'troubleshooting/**/*.md'],
      },
    },
    contributors: {
      merge: 'name',
      debotify: true,
      include: [
        {
          name: 'Mike Pirog',
          email: 'mike@lando.dev',
          title: 'Co-founder',
          org: 'lando.dev',
          orgLink: 'https://lando.dev',
          desc: 'SLAVE4U',
          links: [
            {icon: 'github', link: 'https://github.com/pirog'},
            {icon: 'x', link: 'https://x.com/pirogcommamike'},
          ],
          sponsor: 'https://lando.dev/sponsor',
          maintainer: true,
          mergeOnly: true,
        },
        {
          avatar: 'https://avatars.githubusercontent.com/u/1153738',
          name: 'Alec Reynolds',
          email: 'alec+git@thinktandem.io',
          title: 'Co-founder',
          org: 'lando.dev',
          orgLink: 'https://lando.dev',
          desc: 'A chill dude',
          links: [
            {icon: 'github', link: 'https://github.com/reynoldsalec'},
            {icon: 'x', link: 'https://x.com/reynoldsalec'},
          ],
          sponsor: 'https://lando.dev/sponsor',
          maintainer: true,
          mergeOnly: true,
        },
      ],
    },
    sidebar: {
      '/build': configBar(),
      '/config': configBar(),
      '/cli': cliBar(),
      '/components': configBar(),
      '/composables': configBar(),
      '/guides': configBar(),
      '/markdown': configBar(),
      '/pages': configBar(),
      '/': rootBar(),
    },
  },
});

function rootBar() {
  return [
    {
      text: 'Introduction',
      collapsed: false,
      items: [
        {text: 'What it do?', link: '/getting-started/'},
        {text: 'How does it work?', link: '/getting-started/what-it-do'},
        {text: 'Starting your first app', link: '/getting-started/first-app'},
        {text: 'Requirements', link: '/getting-started/requirements'},
        {text: 'Lando 101', link: '/lando-101'},
      ],
    },
    {
      text: 'Installation',
      collapsed: false,
      items: [
        {text: 'macOS', link: 'https://docs.lando.dev/install/macos.html'},
        {text: 'Linux', link: 'https://docs.lando.dev/install/linux.html'},
        {text: 'Windows', link: 'https://docs.lando.dev/install/windows.html'},
        {text: 'GitHub Actions', link: 'https://docs.lando.dev/install/gha.html'},
        {text: 'Source', link: 'https://docs.lando.dev/install/source.html'},
      ],
    },
    {
      text: 'Help & Support',
      collapsed: false,
      items: [
        {text: 'GitHub', link: 'https://github.com/lando/dotnet/issues/new/choose'},
        {text: 'Slack', link: 'https://www.launchpass.com/devwithlando'},
        {text: 'Contact Us', link: '/support'},
        {text: 'Troubleshooting', link: '/troubleshooting'},
        {text: 'Guides', link: '/guides'},
        {text: 'Examples', link: 'https://github.com/lando/core/tree/main/examples'},
      ],
    },
    {
      text: 'Contributing',
      collapsed: false,
      items: [
        {text: 'Getting Involved', link: '/contrib/index'},
        {text: 'Coding', link: '/contrib/coder'},
        {text: 'Evangelizing', link: '/contrib/evangelist'},
        {text: 'Sponsoring', link: '/contrib/sponsoring'},
        {text: 'Security', link: '/security'},
        {text: 'Team', link: '/team'},

      ],
    },
    {
      collapsed: false,
      items: [
        {
          text: 'Plugins',
          link: '/plugins',
        },
      ],
    },
  ];
};

function cliBar() {
  return [
    {
      text: 'Introduction',
      collapsed: false,
      items: [
        {text: 'Overview', link: '/'},
      ],
    },
    {
      text: 'Commands',
      collapsed: false,
      items: [
        {text: 'lando config', link: '/config'},
        {text: 'lando destroy', link: '/destroy'},
        {text: 'lando exec <span class="VPBadge success" vertical="middle"><small>NEW!</small></span>', link: '/exec'},
        {text: 'lando info', link: '/info'},
        {text: 'lando init', link: '/init'},
        {text: 'lando list', link: '/list'},
        {text: 'lando logs', link: '/logs'},
        {text: 'lando poweroff', link: '/poweroff'},
        {text: 'lando rebuild', link: '/rebuild'},
        {text: 'lando restart', link: '/restart'},
        {text: 'lando ssh <span class="VPBadge danger" vertical="middle"><small>DEPRECATED</small></span>', link: '/ssh'},
        {text: 'lando start', link: '/start'},
        {text: 'lando stop', link: '/stop'},
        {text: 'lando update', link: '/update'},
        {text: 'lando version', link: '/version'},
      ],
    },
    {
      text: 'Mgmt Commands',
      collapsed: false,
      items: [
        {text: 'lando plugin-add', link: '/plugin-add'},
        {text: 'lando plugin-login', link: '/plugin-login'},
        {text: 'lando plugin-logout', link: '/plugin-logout'},
        {text: 'lando plugin-remove', link: '/plugin-remove'},
        {text: 'lando setup', link: '/setup'},
        {text: 'lando shellenv', link: '/shellenv'},
      ],
    },
    {
      text: 'Contribution',
      collapsed: false,
      items: [
        {text: 'Development', link: '/development'},
        {text: 'Team', link: '/team'},
      ],
    },
    {
      text: 'Help & Support',
      collapsed: false,
      items: [
        {text: 'GitHub', link: 'https://github.com/lando/cli/issues/new/choose'},
        {text: 'Slack', link: 'https://www.launchpass.com/devwithlando'},
        {text: 'Contact Us', link: '/support'},
        {text: 'Guides', link: '/guides'},
        {text: 'Examples', link: 'https://github.com/lando/cli/tree/main/examples'},
      ],
    },
  ];
};

function configBar() {
  return [
    {
      text: 'Landofile',
      collapsed: false,
      items: [
        {text: 'Basics', link: '/index'},
        {text: 'Services', link: '/services'},
        {text: 'Recipes', link: '/recipes'},
        {text: 'Tooling', link: '/tooling'},
        {text: 'Proxy', link: '/proxy'},
        {text: 'Events', link: '/events'},
      ],
    },
    {
      text: 'Configuration',
      collapsed: false,
      items: [
        {text: 'Global', link: '/global'},
        {text: 'Environment', link: '/env'},
        {text: 'Experimental', link: '/experimental'},
        {text: 'Orchestrator', link: '/orchestrator'},
        {text: 'Performance', link: '/performance'},
        {text: 'Plugins', link: '/plugins'},
        {text: 'Releases', link: '/releases'},
        {text: 'SSH', link: '/ssh'},
        {text: 'Security', link: '/security'},
        {text: 'Files', link: '/files'},
      ],
    },
    {
      text: 'Plugins',
      collapsed: false,
      items: [
        {text: 'Healthcheck', link: '/healthcheck'},
        {text: 'Networking', link: '/networking'},
        {text: 'Scanner', link: '/scanner'},
      ],
    },
    {
      text: 'Services',
      collapsed: false,
      items: [
        {text: 'Lando Service', link: '/services/lando'},
        {text: 'L-337 Service <small><strong>(BETA)</strong></small>', link: '/services/l337'},
      ],
    },
    {
      text: 'Contribution',
      collapsed: false,
      items: [
        {text: 'Development', link: '/development'},
        {text: 'Team', link: '/team'},
      ],
    },
    {
      text: 'Help & Support',
      collapsed: false,
      items: [
        {text: 'GitHub', link: 'https://github.com/lando/core/issues/new/choose'},
        {text: 'Slack', link: 'https://www.launchpass.com/devwithlando'},
        {text: 'Contact Us', link: '/support'},
        {text: 'Examples', link: 'https://github.com/lando/core/tree/main/examples'},
      ],
    },
  ];
};
