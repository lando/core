<template>
  <div>
    <div
      v-if="pagination()"
      :key="key"
      class="plugins"
    >
      <div class="grid-container">
        <div class="items">
          <div
            v-for="plugin in pagination()"
            :key="plugin.title"
            class="item"
            :class="[grid]"
          >
            <Plugin
              :plugin="plugin"
              :type="props.type"
            />
          </div>
        </div>
      </div>
      <VPButton
        v-if="pages.length > amount"
        size="medium"
        text="load more"
        theme="alt"
        class="load-more-button"
        @click="adder"
      >
        load more
      </VPButton>
    </div>
  </div>
</template>

<script setup>
import {computed, defineAsyncComponent, onMounted, ref, watch} from 'vue';
import {VPButton} from 'vitepress/theme';
import VPLPluginItem from './VPLPluginItem.vue';

const Plugin = defineAsyncComponent({
  loader: async () => VPLPluginItem,
});

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  pager: {
    type: Number,
    default: 100,
  },
  type: {
    type: String,
    default: 'card',
  },
  tags: {
    type: Object,
    default: () => ({}),
  },
});

// Hardcoded pager value for now
const amount = ref(props.pager);
const key = ref(0);

// normalize data and sort
let pages = props.items
  .map(item => Object.assign(item, {show: true, timestamp: item.date ? item.date : item.timestamp}))
  .sort((a, b) => a.title > b.title ? 1 : -1);

const adder = () => amount.value += props.pager;

const grid = computed(() => {
  const length = amount.value;
  if (props.type === 'icon') return 'grid-icon';

  if (!length) {
    return;
  } else if (length === 2) {
    return 'grid-2';
  } else if (length === 3) {
    return 'grid-3';
  } else if (length % 3 === 0) {
    return 'grid-6';
  } else if (length > 3) {
    return 'grid-4';
  } else {
    return 'grid-4';
  }
});

const pagination = () => pages.slice(0, amount.value);

const filter = () => {
  const tagList = Object.entries(props.tags).filter(pair => pair[1].selected === true).map(pair => pair[0]);
  if (tagList.length === 0) return props.items;
  return props.items.filter(item => Array.isArray(item.tags) && tagList.every(tag => item.tags.includes(tag)));
};

// recompute filter when tags change
watch(props.tags, () => {
  pages = filter();
  key.value++;
});

onMounted(() => {
  pages = filter();
  key.value++;
});

</script>

<style scoped>
.plugins {
  position: relative;
  padding: 0 24px;
}

.load-more-button {
  margin: 24px 0px;
  padding: 24px;
}

@media (min-width: 640px) {
  .plugins {
    padding: 0 48px;
  }
}

@media (min-width: 960px) {
  .VPFeatures {
    padding: 0 64px;
  }
}

.grid-container {
  margin: 0 auto;
  max-width: 1152px;
}

.items {
  display: flex;
  flex-wrap: wrap;
  margin: -8px;
}

.item {
  padding: 8px;
  width: 100%;
}

.item.grid-icon {
    width: calc(100% / 2);
  }

@media (min-width: 640px) {
  .item.grid-2,
  .item.grid-4,
  .item.grid-6 {
    width: calc(100% / 2);
  }
  .item.grid-icon {
    width: calc(100% / 2);
  }
}

@media (min-width: 768px) {
  .item.grid-2,
  .item.grid-4 {
    width: calc(100% / 2);
  }

  .item.grid-3,
  .item.grid-6 {
    width: calc(100% / 3);
  }
  .item.grid-icon {
    width: calc(100% / 3);
  }

}

@media (min-width: 960px) {
  .item.grid-4 {
    width: calc(100% / 4);
  }
  .item.grid-icon {
    width: calc(100% / 6);
  }

}
</style>
