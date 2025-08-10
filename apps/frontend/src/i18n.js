import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import lt from './locales/lt.json'

const messages = {
  en,
  lt
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n