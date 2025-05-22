import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // pathモジュールをインポート

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // @ を src ディレクトリへのエイリアスとして設定
    },
  },
})