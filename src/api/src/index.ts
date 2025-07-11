import express from 'express';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3000;

// Use environment variables for DB connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 60000,
  max: Number(process.env.DB_POOL_MAX) || 10,
  min: Number(process.env.DB_POOL_MIN) || 2,
});

const TABLE = 'demo_table';
const DEMO_ROW = { id: 1, message: 'Hello from PostgreSQL!' };

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (id INT PRIMARY KEY, message TEXT NOT NULL)`);
  await pool.query(`INSERT INTO ${TABLE} (id, message) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [DEMO_ROW.id, DEMO_ROW.message]);
}

app.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [DEMO_ROW.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Row not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: (err as Error).message });
  }
});

app.listen(port, async () => {
  try {
    await initDb();
    // eslint-disable-next-line no-console
    console.log(`API server running on port ${port}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
});
