// apps/backend/helpers/resendClient.js

const { Resend } = require('resend');
const logger = require('./logger');

const apiKey = process.env.RESEND_API_KEY;

// In development or when the key is missing, export a safe stub so the app can start.
if (!apiKey) {
  logger.warn('⚠️ RESEND_API_KEY is missing. Email sending will be disabled.');
  module.exports = {
    emails: {
      async send() {
        throw new Error('RESEND_API_KEY is missing. Email sending is disabled.');
      },
    },
  };
} else {
  // Initialize the Resend client with the API key
  module.exports = new Resend(apiKey);
}