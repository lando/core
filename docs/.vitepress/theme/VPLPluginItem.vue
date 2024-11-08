<template>
  <VPLLink
    class="plugin"
    :href="link"
    :no-icon="true"
    :tag="link ? 'a' : 'div'"
  >
    <article
      v-if="type === 'article'"
      :class="`box ${type}`"
    >
      ARTICLE
    </article>

    <article
      v-else-if="type === 'icon'"
      :class="`box ${type}`"
    >
      <div
        v-if="typeof icon === 'object' && icon.wrap"
        class="image"
      >
        <VPImage
          :image="icon"
          :alt="icon.alt"
          :height="icon.height || 48"
          :width="icon.width || 48"
        />
      </div>
      <VPImage
        v-else-if="typeof icon === 'object'"
        :image="icon"
        :alt="icon.alt"
        :height="icon.height || 48"
        :width="icon.width || 48"
      />
      <div
        v-else-if="icon"
        class="image"
        v-html="icon"
      />
      <h2
        class="title"
        v-html="title"
      />
    </article>

    <article
      v-else
      :class="`box card ${type}`"
    >
      <div
        v-if="typeof icon === 'object' && icon.wrap"
        class="image"
      >
        <VPImage
          :image="icon"
          :alt="icon.alt"
          :height="icon.height || 48"
          :width="icon.width || 48"
        />
      </div>
      <VPImage
        v-else-if="typeof icon === 'object'"
        :image="icon"
        :alt="icon.alt"
        :height="icon.height || 48"
        :width="icon.width || 48"
      />
      <div
        v-else-if="icon"
        class="image"
        v-html="icon"
      />
      <h2
        class="title"
        v-html="title"
      />
      <p
        v-if="details"
        class="details"
        v-html="details"
      />

      <div
        class="footer"
      >
        <div class="link-text">
          <p
            v-if="linkText"
            class="link-text-value"
          >
            {{ linkText }} <VPIconArrowRight class="link-text-icon" />
          </p>
        </div>

        <div
          v-if="maintainers"
          class="maintainers"
        >
          <div class="maintainers-flex">
            <VPLTeamMembersItem
              v-for="maintainer in maintainers"
              :key="maintainer.key"
              :member="maintainer"
              size="icon"
            />
          </div>
        </div>
      </div>
    </article>
  </VPLLink>
</template>

<script setup>
import {computed} from 'vue';
import {useData} from 'vitepress';
import {VPImage} from 'vitepress/theme';
import {VPLLink, VPLTeamMembersItem} from '@lando/vitepress-theme-default-plus';
import VPIconArrowRight from 'vitepress/dist/client/theme-default/components/icons/VPIconArrowRight.vue';

const {plugin, type} = defineProps({
  plugin: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    default: 'card',
  },
});

const {theme} = useData();

const details = computed(() => plugin.summary ?? plugin.description);
const link = computed(() => plugin.link ?? plugin.url);
const linkText = computed(() => plugin.linkText ?? '');
const maintainers = computed(() => plugin.maintainers ?? false);

const title = computed(() => {
  if (typeof plugin.title === 'string' && plugin.title.toUpperCase().endsWith('PLUGIN')) {
    return plugin.title.slice(0, -7);
  }
  return plugin.title;
});

const icon = computed(() => {
  // prefer a plugin image
  if (plugin.image) {
    return {
      alt: plugin.title,
      src: plugin.image,
      wrap: true,
    };
  }
  // and then an icon if we have that
  if (plugin.icon) return plugin.icon;
  // and then the collection icon
  if (theme.value?.collections?.plugins?.icon) return theme.value.collections.plugins.icon;
  // and finally this fucking thing
  return '🧩';
});

</script>

<style lang="scss" scoped>
.plugin {
  display: block;
  border: 1px solid var(--vp-c-bg-soft);
  border-radius: 12px;
  height: 100%;
  background-color: var(--vp-c-bg-soft);
  transition: border-color 0.25s, background-color 0.25s;
}

.plugin.link:hover {
  border-color: var(--vp-c-brand-1);
}

.box {
  display: flex;
  flex-direction: column;
  padding: 24px;
  height: 100%;
  &.icon {
    text-align: center;
    gap: 12px;
    .image {
      margin: auto;
    }
  }
}

.box > :deep(.VPImage) {
  margin-bottom: 20px;
}

.image {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  border-radius: 6px;
  background-color: var(--vp-c-default-soft);
  width: 48px;
  height: 48px;
  font-size: 24px;
  transition: background-color 0.25s;
}

.maintainers {
  display: flex;
  justify-content: flex-end;
  margin-right: -10px;
  .VPTeamMembersItem.icon {
    overflow: visible;
    margin-left: -14px;
  }
}
.maintainers-flex {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.title {
  line-height: 24px;
  font-size: 16px;
  font-weight: 600;
}

.details {
  flex-grow: 1;
  padding-top: 8px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.link-text {
  padding-top: 0px;
}

.link-text-value {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

.link-text-icon {
  display: inline-block;
  margin-left: 6px;
  width: 14px;
  height: 14px;
  fill: currentColor;
}
</style>
