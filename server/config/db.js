const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredEnvironmentVariables = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_PORT',
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }
}

const databasePort = Number.parseInt(process.env.DB_PORT, 10);

if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535');
}

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: databasePort,
});

pool.on('connect', () => {
  console.log('🐘 PostgreSQL Connection Pool established successfully!');
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL idle client error:', error);
  process.exit(-1);
});

module.exports = pool;
