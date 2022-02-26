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
    pages: {
      contributors: {
        enabled: false,
      },
      versions: {
        enabled: false,
      },
    },
    sidebar: [
      {
        text: 'Core Config',
        collapsible: false,
        children: [
          '/index.md',
          '/recipes.md',
          '/services.md',
          '/tooling.md',
          '/proxy.md',
          '/env.md',
          '/events.md',
          '/experimental.md',
          '/networking.md',
          '/performance.md',
          '/plugins.md',
          '/releases.md',
          '/ssh.md',
          '/security.md',
          '/files.md',
          '/global.md',
        ],
      },
    ],
  },
};
