import {createRequire} from 'module';

import {defineConfig} from '@lando/vitepress-theme-default-plus/config';

const require = createRequire(import.meta.url);

const {name, version} = require('../../package.json');
const landoPlugin = name.replace('@lando/', '');

export default defineConfig({
  title: 'Lando Core',
  description: 'The offical Lando Core.',
  landoDocs: 3,
  landoPlugin,
  version,
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1'}],
    ['link', {rel: 'icon', href: '/core/favicon.ico', size: 'any'}],
    ['link', {rel: 'icon', href: '/core/favicon.svg', type: 'image/svg+xml'}],
  ],
  themeConfig: {
    sidebar: sidebar(),
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
      collapsed: true,
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
      collapsed: true,
      items: [
        {text: 'Healthcheck', link: '/healthcheck'},
        {text: 'Networking', link: '/networking'},
        {text: 'Scanner', link: '/scanner'},
      ],
    },
    {
      text: 'Services',
      collapsed: true,
      items: [
        {text: 'Lando Service', link: '/lando-service'},
      ],
    },
    {
      text: 'Contribution',
      collapsed: true,
      items: [
        {text: 'Development', link: '/development'},
        {text: 'Team', link: '/team'},
      ],
    },
    {
      text: 'Help & Support',
      collapsed: true,
      items: [
        {text: 'GitHub', link: 'https://github.com/lando/core/issues/new/choose'},
        {text: 'Slack', link: 'https://www.launchpass.com/devwithlando'},
        {text: 'Contact Us', link: '/support'},
      ],
    },
    {text: 'Examples', link: 'https://github.com/lando/core/tree/main/examples'},
  ];
};
