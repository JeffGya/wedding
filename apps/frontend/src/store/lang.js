import { defineStore } from 'pinia';

export const useLangStore = defineStore('lang', {
  state: () => ({
    language: localStorage.getItem('language') || 'en',  // Default to 'en' if not set
  }),

  getters: {
    getCurrentLanguage: (state) => state.language, // Getter to retrieve the current language
  },

  actions: {
    // Set language and persist it in localStorage
    setLanguage(lang) {
      if (lang === 'en' || lang === 'lt') {
        this.language = lang;
        localStorage.setItem('language', lang);  // Persist language setting
      }
    },

    // Initialize language on app load
    initLanguage() {
      const storedLang = localStorage.getItem('language');
      if (storedLang) {
        this.language = storedLang;
      } else {
        this.language = 'en';  // Default language
      }
    }
  }
});