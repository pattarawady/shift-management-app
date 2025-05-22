<template>
  <div class="weekly-view">
    <h2>週次シフトビュー ({{ year }}年 第{{ weekNumber }}週)</h2>
    <p>ここに {{ year }}年 第{{ weekNumber }}週 のガントチャートが表示されます。</p>
    <!-- TODO: 週次ガントチャートコンポーネントを実装 -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const year = computed(() => route.params.year as string);
const weekNumber = computed(() => route.params.weekNumber as string);
</script>

<style scoped>
/* スタイル */
</style>