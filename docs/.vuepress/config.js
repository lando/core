module.exports = {
  lang: 'en-US',
  title: 'Lando',
  description: 'Lando Config Docs.',
  base: '/config/',
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1'}],
    ['link', {rel: 'icon', href: '/config/favicon.ico', size: 'any'}],
    ['link', {rel: 'icon', href: '/config/favicon.svg', type: 'image/svg+xml'}],
    ['link', {rel: 'preconnect', href: '//fonts.googleapis.com'}],
    ['link', {rel: 'preconnect', href: '//fonts.gstatic.com', crossorigin: true}],
    ['link', {rel: 'stylesheet', href: '//fonts.googleapis.com/css2?family=Lexend:wght@500&display=swap'}],
  ],
  theme: '@lando/vuepress-theme-default-plus',
  themeConfig: {
    landoDocs: true,
    logo: '/images/icon.svg',
    docsDir: 'docs',
    docsBranch: 'main',
    repo: 'lando/core',
    sidebarHeader: {
      enabled: false,
    },
    sidebar: [
      {
        text: 'Core Config',
        collapsible: false,
        children: [
          {
            text: 'Landofile',
            link: '/index.md',
          },
          {
            text: 'Recipes',
            link: '/recipes.md',
          },
          {
            text: 'Services',
            link: '/services.md',
          },
          {
            text: 'Tooling',
            link: '/tooling.md',
          },
          {
            text: 'Proxy',
            link: '/proxy.md',
          },
          {
            text: 'Environment',
            link: '/env.md',
          },
          {
            text: 'Events',
            link: '/events.md',
          },
          {
            text: 'Experimental',
            link: '/experimental.md',
          },
          {
            text: 'Networking',
            link: '/networking.md',
          },
          {
            text: 'Performance',
            link: '/performance.md',
          },
          {
            text: 'Plugins',
            link: '/plugins.md',
          },
          {
            text: 'Releases',
            link: '/releases.md',
          },
          {
            text: 'SSH',
            link: '/ssh.md',
          },
          {
            text: 'Security',
            link: '/security.md',
          },
          {
            text: 'Shared Files',
            link: '/files.md',
          },
          {
            text: 'Global Config',
            link: '/global.md',
          },
        ],
      },
      '/support.md',
      {text: 'Release Notes', link: 'https://github.com/lando/config/releases'},
    ],
  },
};
