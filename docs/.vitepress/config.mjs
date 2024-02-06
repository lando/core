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
        { text: 'Basics', link: '/index.html' },
        { text: 'Services', link: '/services.html' },
        { text: 'Recipes', link: '/recipes.html' },
        { text: 'Tooling', link: '/tooling.html' },
        { text: 'Proxy', link: '/proxy.html' },
        { text: 'Events', link: '/events.html' },
      ],
    },
    {
      text: 'Configuration',
      collapsed: true,
      items: [
        { text: 'Global', link: '/global.html' },
        { text: 'Environment', link: '/env.html' },
        { text: 'Experimental', link: '/experimental.html' },
        { text: 'Orchestrator', link: '/orchestrator.html' },
        { text: 'Performance', link: '/performance.html' },
        { text: 'Plugins', link: '/plugins.html' },
        { text: 'Releases', link: '/releases.html' },
        { text: 'SSH', link: '/ssh.html' },
        { text: 'Security', link: '/security.html' },
        { text: 'Files', link: '/files.html' },
      ],
    },
    {
      text: 'Plugins',
      collapsed: true,
      items: [
        { text: 'Healthcheck', link: '/healthcheck.html' },
        { text: 'Networking', link: '/networking.html' },
        { text: 'Scanner', link: '/scanner.html' },
      ],
    },
    {
      text: 'Services',
      collapsed: true,
      items: [
        { text: 'Lando Service', link: '/lando-service.html' },
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
