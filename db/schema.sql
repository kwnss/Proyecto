-- La transacción aplica el esquema como una unidad; IF NOT EXISTS permite repetir la inicialización.
BEGIN;
-- github_id identifica la cuenta externa sin guardar su contraseña ni su token.
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    github_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Estas filas alimentan las tarjetas que consulta GET /api/projects.
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL
);
-- Un visitante puede enviar mensajes sin sesión; por eso user_id admite NULL.
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- connect-pg-simple utiliza esta tabla para conservar las sesiones entre solicitudes.
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);
-- El slug único y ON CONFLICT evitan duplicar proyectos al volver a ejecutar el esquema.
INSERT INTO projects(slug,title,description) VALUES
('portafolio','Portafolio personal','HTML semantico, CSS responsive, JavaScript, Express, API REST, OAuth con GitHub y PostgreSQL.'),
('practicas','Practicas web','Ejercicios de maquetacion y programacion con HTML, CSS y JavaScript.')
ON CONFLICT(slug) DO NOTHING;
COMMIT;
