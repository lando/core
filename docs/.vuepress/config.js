import {defineUserConfig} from '@vuepress/cli';
import {viteBundler} from '@vuepress/bundler-vite';
import {defaultThemePlus} from '@lando/vuepress-theme-default-plus';

export default defineUserConfig({
  lang: 'en-US',
  title: 'Lando',
  description: 'Lando Config Docs.',
  base: '/core/v3/',
  bundler: viteBundler({
    viteOptions: {
      server: {
        fs: {
          strict: false,
        },
      },
    },
  }),
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1'}],
    ['link', {rel: 'icon', href: '/config/favicon.ico', size: 'any'}],
    ['link', {rel: 'icon', href: '/config/favicon.svg', type: 'image/svg+xml'}],
    ['link', {rel: 'preconnect', href: '//fonts.googleapis.com'}],
    ['link', {rel: 'preconnect', href: '//fonts.gstatic.com', crossorigin: true}],
    ['link', {rel: 'stylesheet', href: '//fonts.googleapis.com/css2?family=Lexend:wght@500&display=swap'}],
  ],
  theme: defaultThemePlus({
    landoDocs: 3,
    logo: '/images/icon.svg',
    docsDir: 'docs',
    docsBranch: 'main',
    repo: 'lando/core',
    sidebarHeader: {
      enabled: true,
      title: 'Lando Core',
      icon: '/images/icon.png',
    },
    versionsPage: {
      auto: true,
      trimLatest: true,
      showEdge: true,
    },
    sidebar: [
      {
        text: 'Landofile',
        collapsible: true,
        children: [
          {
            text: 'Basics',
            link: '/index.html',
          },
          '/services.html',
          '/recipes.html',
          '/tooling.html',
          '/proxy.html',
          '/events.html',
        ],
      },
      {
        text: 'Configuration',
        collapsible: true,
        children: [
          '/global.html',
          '/env.html',
          '/experimental.html',
          '/networking.html',
          '/orchestrator.html',
          '/performance.html',
          '/plugins.html',
          '/releases.html',
          '/ssh.html',
          '/security.html',
          '/files.html',
        ],
      },
      {
        text: 'Plugins',
        collapsible: true,
        children: [
          '/healthcheck.html',
          '/scanner.html',
        ],
      },
      {
        text: 'Services',
        collapsible: true,
        children: [
          '/lando-service.html',
        ],
      },
    ],
  }),
});
