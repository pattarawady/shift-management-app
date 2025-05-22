import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

// Element Plus のインポート
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css' // Element Plus のスタイル
// Element Plus Icons のインポート (全てのアイコンをグローバル登録する場合)
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import ganttastic from '@infectoone/vue-ganttastic' 


import './assets/styles/main.css' // グローバルカスタムCSS

const app = createApp(App)

// Pinia のセットアップ
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Vue Router のセットアップ
app.use(router)

// Element Plus のグローバル登録
app.use(ElementPlus)

// Element Plus Icons のグローバル登録
// これにより、テンプレート内で <Edit />, <Delete /> のように直接アイコンコンポーネント名を使用できます
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ganttastic) 

app.mount('#app')