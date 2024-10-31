---
description: Learn the Lando basics with Lando 101
layout: page
title: Lando 101
sidebar: false
---
<VPLCollectionPage>
  <VPLCollectionPageTitle>
    <template #title>
      Lando 101
    </template>
    <template #lead>
      Learn the basics with Lando 101
    </template>
  </VPLCollectionPageTitle>
  <VPLCollectionPageTags v-model="tags" />
  <VPLCollectionItems :tags="tags" :items="pages"/>
</VPLCollectionPage>

<script setup>
import {VPLCollectionPage, VPLCollectionPageTags, VPLCollectionPageTitle, VPLCollectionItems} from '@lando/vitepress-theme-default-plus';
import {useCollection} from '@lando/vitepress-theme-default-plus';
const {pages, tags} = useCollection('lando101');
</script>
