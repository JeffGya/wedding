import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    VueI18n({
      runtimeOnly: false,
      missing: (locale, key) => {
        console.warn(`Missing translation for key "${key}" in locale "${locale}"`);
      },
    })
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^chart\.js$/, replacement: 'chart.js/auto' }
    ]
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_URL
    }
  }
})
