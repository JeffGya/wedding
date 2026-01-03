const { createDbHelpers } = require('../db/queryHelpers');

module.exports = async function getSenderInfo(db) {
  const { dbGet } = createDbHelpers(db);

  try {
    const row = await dbGet(
      `SELECT * FROM email_settings WHERE provider = 'resend' AND enabled = 1 LIMIT 1`,
      []
    );
    if (!row || !row.from_email) {
      return 'Your Wedding Site <onboarding@resend.dev>';
    }
    const fromName = row.from_name || 'Your Wedding Site';
    return `${fromName} <${row.from_email}>`;
  } catch (err) {
    return 'Your Wedding Site <onboarding@resend.dev>';
  }
};