---
title: Documentation
description: Documentation for Lando; a free, open source development tool for all your projects that is fast, easy, powerful and liberating.
layout: page
sidebar: false
pageClass: VPHome is-home

hero:
  name: Lando
  text: Documentation
  tagline: Everything you need to know to dance the Lando.
  image:
    src: /images/icon.png
    alt: Lando logo

features:
  - icon: 😃
    title: Easy
    details: One liner install, cross-platform, simple config file, sane defaults and reduced complexity for power features
  - icon: 🔥
    title: Powerful
    details: A single dev tool for all your projects. Lock down services, tools, dependencies and automation on a per-repo basis
  - icon: 🧩
    title: Extensible
    details: A DevOps framework written in Javascript that you can extend with our or your own plugins.
  - icon: 🕊️
    title: Liberating
    details: Free yourself from the mind-forged manacles of lesser dev tools. Save time, headaches, frustration and do more real work

footer: Copyright ©2025 Lando Alliance
---

<VPHomeHero>
  <template #home-hero-actions-after>
    <div class="actions">
      <div :class="`VPButton medium version ${version.class} version-select-wrapper`">
        <a :href="`${version.href ?? version.base}getting-started/`" :target="version.target" >
          <strong class="alias">{{ version.text }}</strong>
          <small class="version">{{ version.version }}</small>
        </a>
        <VPIconChevronRight v-if="showVersionSelector" class="version-dropdown-icon" @click="toggleVersion"/>
      </div>
      <a class="VPButton medium alt sponsor" href="https://lando.dev/sponsor" target="_blank" rel="noreferrer">
        <svg class="vibe" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="red" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        Sponsor
      </a>
    </div>
  </template>
</VPHomeHero>

<VPHomeFeatures />

<div class="home-other-stuff">
  <VPSponsors tier="special thanks to" mode="normal" :data="all" size="medium"/>
  <div class="et-tu">
    <a href="https://lando.dev/sponsor" target="_blank" rel="noopener">
      {{ `and ${heraldcompute} others, including you?` }}
    </a>
  </div>

  <div class="divider">
    <div class="divider-line"></div>
  </div>

  <MailChimp
    action="https://dev.us12.list-manage.com/subscribe/post?u=59874b4d6910fa65e724a4648&amp;id=613837077f"
    title="Lando Newsletter"
    byline="Join our revolution to free developers from the mind forged manacled of lesser dev tools"
  />
  <footer id="footer">
    <div class="footer-container">
      <div class="footer-copyright">
        <span class="copyright">© 2024</span> LANDO SYSTEM
      </div>
      <div class="footer-links">
        <div class="menu-primary">
          <ul>
            <li>
              <a href="https://lando.dev" target="_blank" rel="noopener noreferrer">Website</a>
            </li>
            <li>
              <a href="https://lando.dev/blog/" target="_blank" rel="noopener noreferrer">Blog</a>
            </li>
            <li>
              <a href="https://lando.dev/events/" target="_blank" rel="noopener noreferrer">Events</a>
            </li>
            <li>
              <a href="https://lando.dev/support/" target="_blank" rel="noopener noreferrer">Support</a>
            </li>
            <li>
              <a href="https://lando.dev/contact/" target="_blank" rel="noopener noreferrer">Contact Us</a>
            </li>
          </ul>
        </div>
        <div class="menu-secondary">
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSc2vkesq59BblKo8ZX-R1hKTrHphh1kmsg4FgWV1WH5BKEjHQ/viewform">
            Careers
          </a>
          <a href="/data">
            Data
          </a>
          <a href="/terms">
            Terms of Use
          </a>
          <a href="/privacy">
            Privacy Policy
          </a>
          <a href="https://www.kalabox.io" target="_blank" rel="noopener noreferrer">
            Kalabox
          </a>
        </div>
      </div>
    </div>
  </footer>
</div>

<script setup>
import yaml from 'js-yaml';
import {computed, onMounted, ref} from 'vue';

import {VPButton} from 'vitepress/theme';
import {VPHomeHero} from 'vitepress/theme';
import {VPHomeFeatures} from 'vitepress/theme';
import {VPSponsors} from 'vitepress/theme';
import {useData, useRoute} from 'vitepress';

import VPIconChevronRight from 'vitepress/dist/client/theme-default/components/icons/VPIconChevronRight.vue';

const VPATH_RE = /^\/v\/v\d+\.\d+\.\d+\/$/;

const {theme, site} = useData();
const route = useRoute();

const getVersion = path => {
  // bail if no version match
  if (!VPATH_RE.test(path)) return undefined;

  // otherwise return the version parth
  path = path.split('/').filter(part => part !== '');
  return path.pop();
};

const versions = [
  {
    text: 'stable docs',
    class: 'stable',
    version: theme.value?.versions?.stable ?? 'stable',
    base: ['/', '/v/stable/'],
    href: '/',
    target: '_self',
  },
  {
    text: 'edge docs',
    class: 'edge',
    version: theme.value?.versions?.edge ?? 'edge',
    base: '/v/edge/',
    target: '_blank',
  },
  {
    text: 'dev docs',
    class: 'dev',
    version: theme.value?.versions?.dev ?? 'dev',
    base: '/v/dev/',
    target: '_blank',
  },
];

// if we are MVB then add the legacy version as a match possibility
if (VPATH_RE.test(route.path)) {
  versions.push({
    text: 'legacy docs',
    class: 'legacy',
    version: getVersion(route.path),
    base: route.path,
    target: '_self',
  })
}

const versionIndex = ref(0);
const version = computed(() => versions[versionIndex.value]);

const showVersionSelector = computed(() => route.path === '/');

const toggleVersion = () => {
  if (versionIndex.value + 1 === versions.length) versionIndex.value = 0;
  else versionIndex.value = versionIndex.value + 1;
}

const getSponsorTier = (sponsors, tier = 'patriot') => {
  if (!Array.isArray(sponsors)) return [];
  return sponsors
    .filter(sponsor => sponsor.tier === tier)
    .map(({name, logo, url}) => ({name, url, img: logo}));
};

const start = 1707233398000;
const sponsors = ref(undefined);
const allies = computed(() => getSponsorTier(sponsors.value, 'ally'));
const patriots = computed(() => getSponsorTier(sponsors.value, 'patriot'));
const heralds = computed(() => getSponsorTier(sponsors.value, 'herald'));
const all = computed(() => patriots.value.concat(allies.value));

const heraldcompute = computed(() => parseInt(heralds.value.length + (Date.now() - start) / 604800000));

// if data is a string/needs to be fetched then do that here
onMounted(async () => {
  // select the version that matches the base
  const base = site?.value?.base ?? '/';
  const pv = getVersion(route.path);

  // if we have a pv then try to set with that
  if (pv) versionIndex.value = versions.findIndex(version => version.version === pv);
  // otherwise get by base
  else {
    versionIndex.value = versions.findIndex(version => {
      if (Array.isArray(version.base)) return version.base.includes(base);
      else return version.base === base;
    });
  }

  // if data is already an array then we good
  if (Array.isArray(sponsors.value)) return;

  try {
    const response = await fetch('https://raw.githubusercontent.com/lando/lando/main/sponsors.yaml');
    sponsors.value = yaml.load(await response.text());
  } catch (error) {
    console.error(`could not fetch and parse data from ${data.value}`);
    console.error(error);
  }
});

</script>

<style lang="scss">
:root {
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, var(--vp-c-brand-1) 30%, #543d87) !important;
}

.action {
  padding: 6px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  padding-top: 24px;
  justify-content: center;
}

.clip {
  color: transparent;
  background-clip: text;
  background: var(--vp-home-hero-name-background);
  font-size: 64px;
}

.dark {
  .VPHome {
    .VPHero {
      .image-bg {
        opacity: .5;
        background-image: linear-gradient(-45deg, var(--vp-c-indigo-1) 50%, var(--vp-c-indigo-1) 50%) !important;
      }
    }
  }
}

.et-tu {
  text-align: center;
  a {
    font-weight: 500;
    color: var(--vp-c-brand-1);
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.25s, opacity 0.25s;
    font-size: 14px;
  }
}

#footer {
	background-color: var(--vp-c-bg);
  padding-top: 12px;
}

.footer-container {
	padding: 48px 0 0;
	display: flex;
	max-width: 100%;
	margin: auto;
	border-top: 1px solid var(--vp-c-gutter);
	background-color: var(--vp-c-bg);
  justify-content: space-between;

	.footer-copyright {
		width: 20%;
		text-align: left;
		color: var(--vp-c-text-1);
		font-size: 14px;
		align-self: end;
		margin-top: 25px;
		.copyright {
			color: var(--vp-c-brand-1);
			font-weight: 900;
		}
	}
	.footer-links {
		width: 0%;
		text-align: right;
		width: 75%;
		a {
			text-decoration: none;
		}
		.menu-primary {
			a {
				color: var(--vp-c-text-1);
        font-size: 14px;
        font-weight: 500;
        color: var(--vp-c-text-1);
				&:hover {
					color: var(--vp-c-brand-1);
				}
			}
			ul {
				display: flex;
				justify-content: flex-end;
				margin-left: -20px;
				li {
					margin-left: 30px;
					margin-left: 20px;
					margin-left: 15px;
				}
			}
		}
		.menu-secondary {
			margin-top: 12px;
			margin-right: -12px;
			a {
				text-transform: uppercase;
				color: var(--vp-c-text-2);
				font-size: 12px;
				&:after {
					content: '\00a0\00a0';
				}
				&:before {
					content: '\00a0\00a0';
				}
				&:hover {
					color: var(--vp-c-brand-1);
					&:after {
						content: " ]";
					}
					&:before {
						content: "[ ";
					}
				}
			}
		}
	}
}
.footer-container .footer-copyright,
.footer-container .footer-links {
	padding: 0;
	margin: 0;
}
.footer-container .footer-links .menu-primary ol,
.footer-container .footer-links .menu-primary ul {
	list-style: none;
	margin: 0;
	padding: 0;
}

.home-other-stuff {
  padding: 64px 0px;
  text-align: center;
  .newsletter__wrap {
    background-color: var(--vp-c-indigo-soft) !important;
  }
  .VPSponsors.vp-sponsor.normal {
    h3.vp-sponsor-tier {
      background-color: transparent;
    }
    .VPSponsorsGrid.vp-sponsor-grid.medium {
      .vp-sponsor-grid-item {
        background-color: transparent;
        img {
          max-height: 75px;
        }
      }
    }
  }
}

.VPButton {
  display: inline-block;
  border: 1px solid transparent;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.25s, border-color 0.25s, background-color 0.25s;
}

.VPButton.alt {
  border-color: var(--vp-button-alt-border);
  color: var(--vp-button-alt-text);
  background-color: var(--vp-button-alt-bg);
}

.VPButton.medium.version {
  min-width: 215px;
  border-color: var(--vp-button-brand-border);
  color: var(--vp-button-brand-text);
  background-color: var(--vp-button-brand-bg);

  .alias {
    text-transform: uppercase;
    font-weight: 800;
  }
  .version {
    opacity: .75;
    margin-left: 5px;
  }

  .version-dropdown-icon {
    height: 15px;
    width: 15px;
    background-color: transparent;
    margin-left: 5px;
    cursor: pointer;
    fill: var(--vp-button-brand-text);
    stroke: var(--vp-button-brand-text);
  }

  &.stable {
    border-color: var(--vp-button-brand-border);
    color: var(--vp-button-brand-text);
    background-color: var(--vp-button-brand-bg);
  }
  &.legacy {
    border-color: var(--vp-button-brand-border);
    color: var(--vp-button-brand-text);
    background-color: var(--vp-c-purple-1);
    .version-dropdown-icon {
      fill: var(--vp-button-brand-text);
      stroke: var(--vp-button-brand-text);
    }
  }
  &.edge {
    border-color: var(--vp-button-brand-border);
    color: var(--vp-button-brand-text);
    background-color: var(--vp-c-indigo-1);
    .version-dropdown-icon {
      fill: var(--vp-button-brand-text);
      stroke: var(--vp-button-brand-text);
    }
  }
  &.dev {
    border-color: var(--vp-button-brand-border);
    color: var(--vp-button-brand-text);
    background-color: var(--vp-c-indigo-1);
    .version-dropdown-icon {
      fill: var(--vp-button-brand-text);
      stroke: var(--vp-button-brand-text);
    }
  }
}

.VPButton.medium {
  border-radius: 20px;
  padding: 0 20px;
  line-height: 38px;
  font-size: 14px;
}

.VPButton.sponsor {
  margin-left: 12px;
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-content: flex-start;
  align-items: center;
  gap: 6px;
  &:hover {
    svg.vibe {
      path {
        fill: red;
      }
      animation-play-state: running;
    }
  }
  svg.vibe {
    width: 18px;
    animation-name: vibe;
    animation-duration: 1s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
    animation-play-state: paused;
    path {
      fill: var(--vp-c-brand-1);
    }
  }
}

.VPHome {
  .VPHero {
    .image-bg {
      background-image: linear-gradient(-45deg, var(--vp-c-purple-1) 50%, var(--vp-c-purple-1) 50%) !important;
      opacity: .66;
    }
    .version-select-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
  .divider {
    .divider-line {
      background-color: var(--vp-c-gutter);
      height: 1px;
      transition: background-color 0.5s;
      margin: 25px 0;
    }
  }
}

@keyframes vibe {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(1px, 1px) rotate(5deg); }
  50% { transform: translate(0, 0) rotate(0deg); }
  75% { transform: translate(-1px, 1px) rotate(-5deg); }
}

@media (min-width: 1290px) {
  .home-other-stuff {
    text-align: left;
    margin: 0 auto;
    max-width: 1152px;
    .VPSponsorsGrid.vp-sponsor-grid.medium {
      justify-content: space-between;
      .vp-sponsor-grid-item {
        width: 140px;
      }
    }
  }
}

@media (max-width: 959px) {
  .VPHome {
    .VPNav {
      .VPNavBar:not(.has-sidebar):not(.home.top) {
        background-color: transparent;
        .divider {
          display: none;
        }
      }
    }
  }

  .footer-container {
    flex-direction: column-reverse;
    margin: auto 0.5em;
    justify-content: center;
    text-align: center;
    .footer-copyright, footer-container, .footer-links {
      flex: 1 1;
      text-align: center;
      margin: auto;
      padding: 0 0.5em;
    }
    .footer-copyright {
      width: 100%;
      margin-bottom: 12px;
    }
    .footer-links .menu-primary ul {
      justify-content: center;
    }
  }
}

@media (min-width: 960px) {
  .VPHome {
    .VPNav {
      .VPNavBar:not(.has-sidebar):not(.home.top) {
        background-color: transparent;
        .divider {
          display: none;
        }
      }
    }
    .image {
      margin-top: 50px;
    }
  }
  .VPHero.has-image .actions {
    justify-content: flex-start;
  }

  .is-home {
    .VPNavBar:not(.has-sidebar):not(.top) {
      background-color: transparent;
      .divider {
        background-color: transparent;
        .divider-line {
          background-color: transparent;
        }
      }
    }
  }
}

@media (max-width: 1200px) {
  .home-other-stuff {
    padding: 0 48px;
  }
}

</style>

