const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || '';

// ถ้าไม่มี DATABASE_URL ให้ export null และแสดง warning
if (!connectionString) {
  console.warn('[db] No DATABASE_URL found - database operations will be disabled');
  module.exports = null;
} else {
  const poolConfig = {
    connectionString , 
    ssl: { rejectUnauthorized: false },
    max: parseInt(process.env.PG_MAX_CLIENTS || '6', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS || '2000', 10),
  };

  // Reuse pool across lambda invocations (Vercel serverless)
  if (!global.__pgPool) {
    console.log('[db] Creating new pg Pool');
    global.__pgPool = new Pool(poolConfig);
    global.__pgPool.on('error', (err) => {
      console.error('[db] Unexpected PG Pool Error', err && (err.stack || err));
    });
  } else {
    console.log('[db] Reusing existing pg Pool');
  }

  module.exports = global.__pgPool;
}
