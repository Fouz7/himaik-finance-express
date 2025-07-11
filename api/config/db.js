import pg from 'pg';
  import dotenv from 'dotenv';

  dotenv.config();

  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const db = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
  };

  export default db;