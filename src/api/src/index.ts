
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Use environment variables for DB connection
// Log DB pool configuration (excluding sensitive info)
// eslint-disable-next-line no-console
console.log('Configuring PostgreSQL pool:', {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  ssl: process.env.DB_SSL_MODE,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 60000,
  max: Number(process.env.DB_POOL_MAX) || 10,
  min: Number(process.env.DB_POOL_MIN) || 2,
});

let pool: Pool;

async function createPool() {
  // Always resolve DB_HOST to IPv4
  const resolvedHost = await dns.promises.lookup(process.env.DB_HOST || '', { family: 4 });
  pool = new Pool({
    host: resolvedHost.address,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 60000,
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 2,
  });
}


const TABLE = 'demo_table';
const DEMO_ROW = { id: 1, message: 'Hello from PostgreSQL!' };

async function initDb() {
  // eslint-disable-next-line no-console
  console.log('Initializing database and demo table...');
  await pool.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (id INT PRIMARY KEY, message TEXT NOT NULL)`);
  await pool.query(`INSERT INTO ${TABLE} (id, message) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [DEMO_ROW.id, DEMO_ROW.message]);
  // eslint-disable-next-line no-console
  console.log('Database initialization complete.');
}

import type { Request, Response } from 'express';

app.get('/', async (_req: Request, res: Response) => {
  // eslint-disable-next-line no-console
  console.log('Received GET / request');
  try {
    const { rows } = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [DEMO_ROW.id]);
    // eslint-disable-next-line no-console
    console.log('Database query executed for demo row');
    if (rows.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Row found, sending response:', rows[0]);
      res.json(rows[0]);
    } else {
      // eslint-disable-next-line no-console
      console.log('Row not found, sending 404');
      res.status(404).json({ error: 'Row not found' });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Database error:', (err as Error).message);
    res.status(500).json({ error: 'Database error', details: (err as Error).message });
  }
});

app.listen(port, async () => {
  try {
    await createPool();
    await initDb();
    // eslint-disable-next-line no-console
    console.log(`API server running on port ${port}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
});
