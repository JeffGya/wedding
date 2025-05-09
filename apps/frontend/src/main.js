import 'uno.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from '@/router'
import Toast, { useToast } from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { configure, defineRule } from 'vee-validate';
import { localize } from '@vee-validate/i18n';
import validationEn from '@vee-validate/i18n/dist/locale/en.json';
import i18n from '@/i18n';
import * as rules from '@vee-validate/rules';

// Register all built-in rules, skipping any non-function exports (e.g., the 'all' JSON object)
Object.keys(rules).forEach(name => {
  if (typeof rules[name] === 'function') {
    defineRule(name, rules[name]);
  }
});

// Configure VeeValidate
configure({
  generateMessage: localize({ en: validationEn }),  // use VeeValidate English locale
  validateOnInput: true,              // validate on each input event
});

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Toast)
app.use(i18n)
app.mount('#app')
