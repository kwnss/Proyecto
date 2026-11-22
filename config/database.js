require('dotenv').config();
const { Pool } = require('pg');
// Conexión a PostgreSQL.
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 }) : null;
if (pool) pool.on('error', () => console.error('Conexion PostgreSQL interrumpida.'));
async function query(text, values) {
    if (!pool) throw Object.assign(new Error('Base de datos sin configurar'), { code: 'DB_UNAVAILABLE' });
    return pool.query(text, values);
}
module.exports = { pool, query };
