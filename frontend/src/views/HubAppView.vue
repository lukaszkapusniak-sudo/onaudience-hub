<script setup lang="ts">
import { computed } from 'vue';

/** Same-origin legacy hub — session shared via `oaHubSession` after Vue hydrates OAuth. */
const hubFrameSrc = computed(() => `${import.meta.env.BASE_URL}hub/index.html`);
</script>

<template>
  <div class="hub-host">
    <iframe class="hub-frame" title="onAudience Sales Intelligence Hub" :src="hubFrameSrc" />
  </div>
</template>

<style scoped>
.hub-host {
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  background: #0c0c0a;
}
.hub-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
