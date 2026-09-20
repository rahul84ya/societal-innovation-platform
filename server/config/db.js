const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

let poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  };
} else {
  const requiredEnvironmentVariables = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_PORT',
  ];

  for (const variableName of requiredEnvironmentVariables) {
    if (!process.env[variableName]) {
      throw new Error(`Missing required environment variable: ${variableName} (or supply DATABASE_URL)`);
    }
  }

  const databasePort = Number.parseInt(process.env.DB_PORT, 10);

  if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: databasePort,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('🐘 PostgreSQL Connection Pool established successfully!');
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL idle client error:', error);
  process.exit(-1);
});

module.exports = pool;
