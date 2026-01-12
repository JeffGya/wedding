/**
 * Email Template Locale Translations
 * Provides translations for email template labels and text
 */

const translations = {
  en: {
    // Info Card labels
    infoCard: {
      date: 'Date',
      location: 'Location',
      time: 'Time'
    },
    // RSVP Code
    rsvpCode: {
      label: 'Your RSVP Code'
    },
    // Footer and sign-off
    footer: {
      signoff: 'With love and joy,',
      preheader: "We can't wait to celebrate with you",
      disclaimer: 'We will keep the emails to a minimum. Contact us if there are any questions.'
    }
  },
  lt: {
    // Info Card labels
    infoCard: {
      date: 'Data',
      location: 'Vieta',
      time: 'Laikas'
    },
    // RSVP Code
    rsvpCode: {
      label: 'RSVP Kodas'
    },
    // Footer and sign-off
    footer: {
      signoff: 'Su meile ir džiaugsmu,',
      preheader: 'Negalime laukti švęsti su jumis',
      disclaimer: 'El. laiškų bus kuo mažiau. Susisiekite su mumis, jei turite klausimų.'
    }
  }
};

/**
 * Get translation for a given key and language
 * @param {string} key - Translation key (e.g., 'infoCard.date', 'rsvpCode.label')
 * @param {string} language - Language code ('en' or 'lt')
 * @returns {string} Translated text
 */
function getTranslation(key, language = 'en') {
  const lang = language === 'lt' ? 'lt' : 'en';
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if translation not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

/**
 * Get all translations for a section
 * @param {string} section - Section name (e.g., 'infoCard', 'rsvpCode', 'footer')
 * @param {string} language - Language code ('en' or 'lt')
 * @returns {Object} Object with all translations for the section
 */
function getSectionTranslations(section, language = 'en') {
  const lang = language === 'lt' ? 'lt' : 'en';
  return translations[lang][section] || translations.en[section] || {};
}

module.exports = {
  getTranslation,
  getSectionTranslations,
  translations
};

