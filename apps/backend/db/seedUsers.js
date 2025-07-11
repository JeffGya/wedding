require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('Seeding into database:', process.env.DB_NAME);
  await connection.query(`USE \`${process.env.DB_NAME}\``);

  // Define your users to seed
  const users = [
    { name: 'Future Husband Jeffrey', email: 'jeffogya@gmail.com', password: 'Fbjqp4H6woww9' },
    { name: 'Future Wife Brigita', email: 'brigitabruno@gmail.com', password: '6B2jt5qy8WHqm' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const sql = `
      INSERT IGNORE INTO users (name, email, passwordHash)
      VALUES (?, ?, ?)
    `;
    await connection.execute(sql, [u.name, u.email, hash]);
    console.log(`– inserted user ${u.email}`);
  }

  await connection.end();
  console.log('✅ MySQL: users seeded.');
  process.exit(0);
})();