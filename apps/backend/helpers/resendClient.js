// apps/backend/helpers/resendClient.js

const { Resend } = require('resend');

// Check if API key is available
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is missing. Please set it in your environment variables.');
  process.exit(1); // Exit immediately to prevent undefined behavior
}

// Initialize the Resend client with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;