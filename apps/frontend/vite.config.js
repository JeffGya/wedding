import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import UnoCSS from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      UnoCSS(),
      Icons({ compiler: 'vue3' }),
    ],
    
    // Base configuration
    base: env.VITE_BASE_URL || '/',
    
    // Resolve aliases
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@views': resolve(__dirname, 'src/views'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@stores': resolve(__dirname, 'src/store'),
        '@layouts': resolve(__dirname, 'src/layouts'),
        // Remove the ~icons alias - unplugin-icons handles this automatically
      },
    },
    
    // Development server configuration
    server: {
      port: parseInt(env.VITE_DEV_PORT) || 3000,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    
    // Preview server configuration
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT) || 4173,
      host: true,
    },
    
    // Build configuration
    build: {
      target: 'esnext',
      minify: 'terser',
      sourcemap: mode === 'development',
      
      // Optimized chunk splitting - keeping your working chunks
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
      
      // Performance optimizations
      chunkSizeWarningLimit: 1500,
      assetsInlineLimit: 4096,
    },
    
    // CSS configuration
    css: {
      postcss: {
        plugins: [
          // Tailwind CSS is handled by UnoCSS
          // Autoprefixer is included by default in modern builds
        ],
      },
    },
    
    // Optimizations - keeping your working dependencies
    optimizeDeps: {
      include: [
        'vue', 'vue-router', 'pinia',
        'primevue/config', 'primevue/usetoast', 'primevue/confirmationservice',
        'vee-validate', '@vee-validate/rules',
        'quill', 'fuse.js',
      ],
    },
    
    // Environment variables
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: mode === 'development',
    },
  }
})
