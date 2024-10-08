import {createRequire} from 'module';

import {defineConfig} from '@lando/vitepress-theme-default-plus/config';

const require = createRequire(import.meta.url);

// get plugin stuff
const {name, version} = require('../../package.json');
const landoPlugin = name.replace('@lando/', '');

export default defineConfig({
  title: 'Lando Core',
  description: 'The offical Lando Core.',
  landoDocs: 3,
  landoPlugin,
  version,
  base: '/core/v3/',
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1'}],
    ['link', {rel: 'icon', href: '/core/favicon.ico', size: 'any'}],
    ['link', {rel: 'icon', href: '/core/favicon.svg', type: 'image/svg+xml'}],
  ],
  rewrites: {
    'lando-service.md': 'services/lando.md',
  },
  themeConfig: {
    contributors: {
      merge: 'name',
      debotify: true,
      include: [
        {
          name: 'Mike Pirog',
          email: 'mike@thinktandem.io',
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
    sidebar: sidebar(),
    multiVersionBuild: {
      satisfies: '>=3.21.2',
    },
  },
});

function sidebar() {
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
