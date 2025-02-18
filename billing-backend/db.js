// db.js
require('dotenv').config();

const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === 'production';

// Log environment state
console.log('Environment:', {
  isProduction,
  nodeEnv: process.env.NODE_ENV
});

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

// Log config (without sensitive data)
console.log('Connection config:', {
  host: connectionConfig.host,
  database: connectionConfig.database,
  port: connectionConfig.port,
  ssl: connectionConfig.ssl
});

const pool = new Pool(connectionConfig);

// Add connection error handling
pool.on('connect', () => {
  console.log('Database connected successfully');
  // Test query to verify schema
  pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'partners\'')
    .then(res => console.log('Partners table columns:', res.rows))
    .catch(err => console.error('Error checking schema:', err));
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = { pool };