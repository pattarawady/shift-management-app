<template>
  <div id="app-container">
    <header class="app-header">
      <h1>宿のシフト管理アプリ</h1>
      <nav>
        <router-link to="/">ホーム (月次)</router-link> |
        <router-link :to="`/daily/${today}`">今日の日次</router-link> |
        <!-- 週次ビューへのリンクは適切な週番号を計算する必要があるため、一旦プレースホルダ -->
        <router-link to="/weekly/2024/20">週次 (例)</router-link> |
        <router-link to="/staff">スタッフ管理</router-link> |
        <router-link to="/settings">設定・データ管理</router-link>
      </nav>
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <footer class="app-footer">
      <p>&copy; 2024 宿のシフト管理アプリ</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import dayjs from 'dayjs'; // 日付操作のためにdayjsをインポート (あとでインストール)

const today = computed(() => dayjs().format('YYYY-MM-DD'));

// 週次ビューへの適切なリンクを生成するロジックは後ほど検討
// const currentYear = computed(() => dayjs().year());
// const currentWeek = computed(() => dayjs().isoWeek()); // ISO週番号
</script>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.app-header {
  background-color: #42b983;
  color: white;
  padding: 1rem;
  text-align: center;
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
}

.app-header nav a {
  font-weight: bold;
  color: #f0f0f0;
  margin: 0 0.5rem;
  text-decoration: none;
}

.app-header nav a.router-link-exact-active {
  color: #ffffff;
  text-decoration: underline;
}

.app-main {
  flex-grow: 1;
  padding: 1rem;
}

.app-footer {
  background-color: #f5f5f5;
  padding: 1rem;
  text-align: center;
  font-size: 0.9em;
  color: #777;
}
</style>