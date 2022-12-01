import {defineUserConfig} from '@vuepress/cli';
import {defaultThemePlus} from '@lando/vuepress-theme-default-plus';

export default defineUserConfig({
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
  theme: defaultThemePlus({
    landoDocs: true,
    logo: '/images/icon.svg',
    docsDir: 'docs',
    docsBranch: 'main',
    repo: 'lando/core',
    sidebarHeader: false,
    versionsPage: false,
    contributorsPage: false,
    sidebar: [
      {
        text: 'Core Config',
        collapsible: false,
        children: [
          '/index.html',
          '/recipes.html',
          '/services.html',
          '/tooling.html',
          '/proxy.html',
          '/env.html',
          '/events.html',
          '/experimental.html',
          '/networking.html',
          '/performance.html',
          '/plugins.html',
          '/releases.html',
          '/ssh.html',
          '/security.html',
          '/files.html',
          '/global.html',
        ],
      },
    ],
  }),
});
