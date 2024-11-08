---
description: Home helpful troubleshooting materials for Lando
layout: page
title: Troubleshooting
sidebar: false
---
<VPLCollectionPage>
  <VPLCollectionPageTitle>
    <template #title>
      Troubleshooting
    </template>
    <template #lead>
      Home helpful troubleshooting materials for Lando
    </template>
  </VPLCollectionPageTitle>
  <VPLCollectionPageTags v-model="tags" />
  <VPLCollectionItems :tags="tags" :items="pages"/>
</VPLCollectionPage>

<script setup>
import {VPLCollectionPage, VPLCollectionPageTags, VPLCollectionPageTitle, VPLCollectionItems} from '@lando/vitepress-theme-default-plus';
import {useCollection} from '@lando/vitepress-theme-default-plus';

const {pages, tags} = useCollection('troubleshooting');
</script>
