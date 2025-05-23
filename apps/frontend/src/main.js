import 'virtual:uno.css'
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

import PrimeVue from 'primevue/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Button from "primevue/button";
import ToggleSwitch from 'primevue/toggleswitch'
import ProgressBar from 'primevue/progressbar';

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

const MyPreset = definePreset(Aura, {
  semantic: {
      primary: {
        100: '#fff',
        200: '',
        300: '',
        400: '#fff',
        500: '#442727',
        600: '#5A3A3A',
        700: '#3B1E1E',
      }, 
      colorScheme: {
        light: {
            primary: {
                color: '{primary.500}',
                contrastColor: '#D2C6B2',
                hoverColor: '{primary.600}',
                activeColor: '{primary.700}'
            },
            highlight: {
                background: '{primary.950}',
                focusBackground: '{primary.700}',
                color: '#ffffff',
                focusColor: '#ffffff'
            }
        },
        dark: {
            primary: {
                color: '{primary.50}',
                contrastColor: '{primary.950}',
                hoverColor: '{primary.200}',
                activeColor: '{primary.300}'
            },
            highlight: {
                background: '{primary.50}',
                focusBackground: '{primary.300}',
                color: '{primary.950}',
                focusColor: '{primary.950}'
            }
        }
      },
    },
    components: {
      ToggleSwitch: {
        width: '4rem',

        handle : {
          width: '2rem',
          height: '2rem',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 0 0.5rem rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease-in-out',
        },
      }
    },
});

app.use(createPinia())
app.use(Toast)
app.use(i18n)
app.use(router)

app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: MyPreset,
    options: {
      darkModeSelector: '.dark-mode',
    }
  }
});
app.component('Button', Button);
app.component('ToggleSwitch', ToggleSwitch);
app.component('ProgressBar', ProgressBar);

app.mount('#app')
