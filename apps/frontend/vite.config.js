import UnoCSS from 'unocss/vite'
import presetUno from '@unocss/preset-uno'
import { transformerDirectives, transformerVariantGroup } from 'unocss'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import Icons from 'unplugin-icons/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS({
      presets: [
        presetUno(),
      ],
      transformers: [
        transformerDirectives(),
        transformerVariantGroup(),
      ],
    }),
    Icons({ compiler: 'vue3' }),
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
