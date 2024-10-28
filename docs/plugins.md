---
title: Plugins
description: Browse, filter, sort, search and vibe all the plugins in the Lando ecosystem
layout: page
sidebar: false
aside: false
---
<VPLCollectionPage>
  <VPLCollectionPageTitle>
    <template #title>
      Plugins
    </template>
    <template #lead>
      It's dangerous to go alone, take some of these:
    </template>
  </VPLCollectionPageTitle>
  <div class="other-tags">
    <VPLCollectionTag @click="toggle()" v-bind="toggleTag"/>
  </div>
  <VPLCollectionPageTags v-model="filteredTags" />
  <VPLPluginItems :key="toggleTag.type" :items="pages" :tags="filteredTags" :type="toggleTag.type"/>
</VPLCollectionPage>

<script setup>
import {computed, reactive, ref} from 'vue';
import {useCollection} from '@lando/vitepress-theme-default-plus';
import {VPLCollectionPage, VPLCollectionPageTags, VPLCollectionPageTitle} from '@lando/vitepress-theme-default-plus';
import VPLCollectionTag from '@lando/vitepress-theme-default-plus/components/VPLCollectionTag.vue';
import VPLPluginItems from '.vitepress/theme/VPLPluginItems.vue';

const cardSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M3 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H3Zm2.5 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 5.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm.75 3.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM10 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 10 8Zm-2.378 3c.346 0 .583-.343.395-.633A2.998 2.998 0 0 0 5.5 9a2.998 2.998 0 0 0-2.517 1.367c-.188.29.05.633.395.633h4.244Z" clip-rule="evenodd" /></svg>';
const iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v2A1.5 1.5 0 0 0 3.5 7h2A1.5 1.5 0 0 0 7 5.5v-2A1.5 1.5 0 0 0 5.5 2h-2ZM3.5 9A1.5 1.5 0 0 0 2 10.5v2A1.5 1.5 0 0 0 3.5 14h2A1.5 1.5 0 0 0 7 12.5v-2A1.5 1.5 0 0 0 5.5 9h-2ZM9 3.5A1.5 1.5 0 0 1 10.5 2h2A1.5 1.5 0 0 1 14 3.5v2A1.5 1.5 0 0 1 12.5 7h-2A1.5 1.5 0 0 1 9 5.5v-2ZM10.5 9A1.5 1.5 0 0 0 9 10.5v2a1.5 1.5 0 0 0 1.5 1.5h2a1.5 1.5 0 0 0 1.5-1.5v-2A1.5 1.5 0 0 0 12.5 9h-2Z" /></svg>';

function omit(obj, ...props) {
  const result = { ...obj };
  props.forEach(function(prop) {
    delete result[prop];
  });
  return result;
}
// lets omit these for now, we can add them back when we have more plugins
const omitTags = ['official', 'unsupported'];
const {pages, tags} = useCollection('plugins');

const cards = ref(true);
const filteredTags = reactive(omit(tags, ...omitTags));
const toggleTag = computed(() => ({
  color: 'var(--vp-c-brand-soft)',
  styles: {
    'border-color': 'var(--vp-c-brand-soft)',
  },
  icon: cards.value ? iconSVG : cardSVG,
  text: cards.value ? 'show icons' : 'show cards',
  type: cards.value ? 'card' : 'icon',
}));

const toggle = () => {
  cards.value = !cards.value;
}
</script>

<style scoped>
.other-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: center;
  align-items: center;
  padding: 0 12px 0;
}
</style>
