const { readFileSync } = require('node:fs');
const { query, pool } = require('../config/database');
// Ejecutar el archivo SQL mantiene la definición de tablas separada de las rutas HTTP.
query(readFileSync(require('node:path').join(__dirname, 'schema.sql'), 'utf8'))
    .then(() => console.log('Esquema inicializado sin borrar datos existentes.'))
    .catch(() => { console.error('No se pudo inicializar PostgreSQL. Revisa DATABASE_URL y que el servidor este iniciado.'); process.exitCode = 1; })
    .finally(() => pool?.end());
