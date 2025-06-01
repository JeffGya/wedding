module.exports = async function getSenderInfo(db) {
  const util = require('util');
  let dbGet;
  if (process.env.DB_TYPE === 'mysql') {
    dbGet = async (sql, params) => {
      const [rows] = await db.query(sql, params);
      return rows[0];
    };
  } else {
    const sqlite3 = require('sqlite3').verbose();
    dbGet = util.promisify(db.get.bind(db));
  }

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