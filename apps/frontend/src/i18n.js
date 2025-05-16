import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import lt from './locales/lt.json'

const messages = {
  en,
  lt
}

/* 
const messages = {
  en: {
    "test": "Welcome to our wedding website!"
      },
  lt: {
    "test":  "Sveiki atvykę į mūsų vestuvių svetainę!",
      }
    }
*/
console.log('Loaded translations', messages)
// import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  // using the Composition API mode (no legacy)
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n