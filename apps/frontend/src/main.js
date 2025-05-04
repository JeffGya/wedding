import 'uno.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from '@/router'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { configure } from 'vee-validate';
import { localize } from '@vee-validate/i18n';
import en from '@vee-validate/i18n/dist/locale/en.json';

// Configure VeeValidate
configure({
  generateMessage: localize({ en }),  // use English locale
  validateOnInput: true,              // validate on each input event
});

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Toast)
app.mount('#app')
