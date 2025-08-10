import UnoCSS from 'unocss/vite'
import presetUno from '@unocss/preset-uno'
import { transformerDirectives, transformerVariantGroup } from 'unocss'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS({
      presets: [presetUno()],
      transformers: [transformerDirectives(), transformerVariantGroup()],
    }),
    Icons({ compiler: 'vue3' }),
    VueI18n({
      runtimeOnly: true,
      compositionOnly: true,
      strictMessage: true,
      include: fileURLToPath(new URL('./src/locales/**', import.meta.url)),
      // missing: (locale, key) => { if (import.meta.env.DEV) console.warn(`Missing translation "${key}" [${locale}]`) }
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^chart\.js$/, replacement: 'chart.js/auto' },
    ],
  },
  optimizeDeps: {
    include: [
      'vue', 'vue-router', 'pinia',
      'primevue/config', 'primevue/usetoast', 'primevue/confirmationservice',
      'vee-validate', '@vee-validate/rules',
      'quill', 'fuse.js',
    ],
  },
  build: {
    target: 'es2019',
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          i18n: ['vue-i18n'],
          validate: ['vee-validate', '@vee-validate/rules'],
          prime: [
            'primevue/config', 'primevue/toastservice', 'primevue/confirmationservice',
          ],
          editor: ['quill', 'primevue/editor'],
          search: ['fuse.js'],
          charts: ['chart.js/auto', 'primevue/chart'],
        },
      },
    },
  },
  define: {
    __VUE_PROD_DEVTOOLS__: false,
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_URL,
    },
  },
})
