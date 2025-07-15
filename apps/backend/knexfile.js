// apps/backend/knexfile.js
require('dotenv').config();
const path = require('path');

const isMysql = process.env.DB_TYPE === 'mysql';

const baseConfig = {
  migrations: {
    directory: path.join(__dirname, 'migrations')
  }
};

module.exports = {
  development: {
    client: isMysql ? 'mysql2' : 'sqlite3',
    connection: isMysql
      ? {
          host:     process.env.DB_HOST,
          port:     Number(process.env.DB_PORT),
          user:     process.env.DB_USER,
          password: process.env.DB_PASS,
          database: process.env.DB_NAME
        }
      : {
          filename: process.env.DB_PATH || './database.sqlite'
        },
    useNullAsDefault: !isMysql,
    ...baseConfig
  },
  staging: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT),
      user:     process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    },
    ...baseConfig
  },
  production: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT),
      user:     process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    },
    ...baseConfig
  }
};