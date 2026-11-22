require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const path = require('node:path');
const database = require('./config/database');

function createApp(db = database) {
    const app = express();
    const production = process.env.NODE_ENV === 'production';
    const publicUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
    const baseUrl = new URL(publicUrl || 'http://localhost:3000').origin;
    const oauthReady = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.SESSION_SECRET && database.pool);
    if (production && (!process.env.SESSION_SECRET || !database.pool)) throw new Error('Configura SESSION_SECRET y DATABASE_URL para produccion.');
    if (production && (!publicUrl || !baseUrl.startsWith('https://'))) throw new Error('Configura una URL publica HTTPS para produccion.');
    // HTTPS de Render y dirección del visitante.
    if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
    app.use(helmet());
    app.use(express.json({ limit: '16kb' }));
    const PgStore = require('connect-pg-simple')(session);
    // Sesiones.
    app.use(session({
        secret: process.env.SESSION_SECRET || randomBytes(48).toString('hex'),
        store: database.pool ? new PgStore({ pool: database.pool, createTableIfMissing: false }) : undefined,
        resave: false, saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 86400000 }
    }));
    app.use('/api', rateLimit({ windowMs: 60000, limit: 60 }));
    // Estado de la base y proyectos.
    app.get('/api/health', async (req, res) => {
        try { await db.query('SELECT 1'); res.json({ database: 'connected', oauthConfigured: oauthReady }); }
        catch { res.status(503).json({ database: 'unavailable', oauthConfigured: oauthReady, error: 'Configura PostgreSQL y ejecuta npm run db:init.' }); }
    });
    app.get('/api/projects', async (req, res, next) => {
        try { res.json({ projects: (await db.query('SELECT id, title, description FROM projects ORDER BY id')).rows }); }
        catch (error) { next(error); }
    });
    app.get('/api/me', (req, res) => res.json({ user: req.session.user || null, oauthConfigured: oauthReady }));
    // Mensajes de contacto.
    app.post('/api/contact', rateLimit({ windowMs: 60000, limit: 5 }), async (req, res, next) => {
        const { nombre, correo, mensaje } = req.body || {};
        if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 100 ||
            typeof correo !== 'string' || correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
            typeof mensaje !== 'string' || mensaje.trim().length < 10 || mensaje.length > 5000) {
            return res.status(400).json({ error: 'Revisa nombre (1-100), correo valido y mensaje (10-5000 caracteres).' });
        }
        try {
            // Parámetros de la consulta.
            const result = await db.query('INSERT INTO messages(name,email,message,user_id) VALUES($1,$2,$3,$4) RETURNING id', [nombre.trim(), correo.trim(), mensaje.trim(), req.session.user?.id || null]);
            res.status(201).json({ id: result.rows[0].id, message: 'Mensaje guardado correctamente.' });
        } catch (error) { next(error); }
    });
    app.get('/auth/github', (req, res) => {
        if (!oauthReady) return res.status(503).send('Configura GitHub, SESSION_SECRET y PostgreSQL siguiendo el README.');
        // Inicio de OAuth.
        req.session.oauthState = randomBytes(32).toString('hex');
        const params = new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID, redirect_uri: `${baseUrl}/auth/github/callback`, state: req.session.oauthState, scope: 'read:user' });
        req.session.save(error => error ? res.status(503).send('No se pudo iniciar la sesion.') : res.redirect(`https://github.com/login/oauth/authorize?${params}`));
    });
    app.get('/auth/github/callback', async (req, res) => {
        const expected = req.session.oauthState;
        delete req.session.oauthState;
        const state = req.query.state;
        if (!oauthReady || typeof state !== 'string' || !expected || Buffer.byteLength(state) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)) || typeof req.query.code !== 'string') return res.status(400).send('Autorizacion invalida. Intenta iniciar sesion otra vez.');
        try {
            // Comprobación de la respuesta de GitHub.
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code: req.query.code, redirect_uri: `${baseUrl}/auth/github/callback` }), signal: AbortSignal.timeout(10000) });
            const token = await tokenResponse.json();
            if (!tokenResponse.ok || !token.access_token) throw new Error('OAuth failed');
            const profileResponse = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'portfolio' }, signal: AbortSignal.timeout(10000) });
            const profile = await profileResponse.json();
            if (!profileResponse.ok || !profile.id) throw new Error('Profile failed');
            const result = await db.query('INSERT INTO users(github_id,name) VALUES($1,$2) ON CONFLICT(github_id) DO UPDATE SET name=EXCLUDED.name RETURNING id,name', [String(profile.id), profile.name || profile.login]);
            req.session.regenerate(error => {
                if (error) return res.status(503).send('No se pudo crear la sesion.');
                req.session.user = result.rows[0];
                req.session.save(saveError => saveError ? res.status(503).send('No se pudo guardar la sesion.') : res.redirect('/'));
            });
        } catch { res.status(503).send('No se pudo completar el acceso. Revisa GitHub y PostgreSQL e intenta nuevamente.'); }
    });
    app.post('/auth/logout', (req, res) => {
        // Cierre de sesión.
        if (req.get('origin') !== new URL(baseUrl).origin) return res.status(403).json({ error: 'Origen invalido.' });
        req.session.destroy(error => { if (error) return res.status(503).json({ error: 'No se pudo cerrar la sesion.' }); res.clearCookie('connect.sid'); res.json({ ok: true }); });
    });
    app.use(express.static(path.join(__dirname, 'public')));
    // Respuestas de error.
    app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalido.' });
        if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud demasiado grande.' });
        console.error('Solicitud fallida:', error.code || 'SERVER_ERROR');
        res.status(503).json({ error: 'Servicio no disponible. Revisa PostgreSQL y ejecuta npm run db:init. No se guardaron datos.' });
    });
    return app;
}
module.exports = { createApp };
