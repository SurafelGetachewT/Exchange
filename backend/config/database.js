const { Pool } = require('pg');
require('dotenv').config();

const hasDatabaseUrl = !!process.env.DATABASE_URL;
const connectionTimeoutMs = Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10);
const resolvedConnectionTimeoutMs = Number.isFinite(connectionTimeoutMs) ? connectionTimeoutMs : 20000;

const pool = new Pool({
  ...(hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'crypto_exchange',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
      }),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: resolvedConnectionTimeoutMs, // How long to wait when connecting a new client
});

// Test database connection
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
