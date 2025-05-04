import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^chart\.js$/, replacement: 'chart.js/auto' }
    ]
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
})
