// src/i18n.js
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import lt from './locales/lt.json';

// you may be using the Composition API mode (legacy: false) or legacy mode
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, lt },
});

export default i18n;