---
description: Home helpful generic tutorial and guide content for lando
layout: page
title: Guides
sidebar: false
---
<VPLCollectionPage>
  <VPLCollectionPageTitle>
    <template #title>
      Guides
    </template>
    <template #lead>
      Some general purpose Lando tutorials and guides
    </template>
  </VPLCollectionPageTitle>
  <VPLCollectionPageTags v-model="tags" />
  <VPLCollectionItems :tags="tags" :items="pages"/>
</VPLCollectionPage>

<script setup>
import {VPLCollectionPage, VPLCollectionPageTags, VPLCollectionPageTitle, VPLCollectionItems} from '@lando/vitepress-theme-default-plus';
import {useCollection} from '@lando/vitepress-theme-default-plus';

const {pages, tags} = useCollection('guide');
</script>

