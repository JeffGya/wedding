module.exports = async function getSenderInfo(db) {
    return new Promise((resolve) => {
      const sql = `SELECT * FROM email_settings WHERE provider = 'resend' AND enabled = 1 LIMIT 1`;
      db.get(sql, [], (err, row) => {
        if (err || !row || !row.from_email) {
          return resolve('Your Wedding Site <onboarding@resend.dev>');
        }
  
        const fromName = row.from_name || 'Your Wedding Site';
        resolve(`${fromName} <${row.from_email}>`);
      });
    });
  };