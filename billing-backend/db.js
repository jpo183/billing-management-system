// db.js
require('dotenv').config();

const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: isProduction ? {
    rejectUnauthorized: false,
    require: true
  } : false
};

const pool = new Pool(connectionConfig);

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = { pool };