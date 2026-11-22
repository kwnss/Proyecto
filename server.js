const { createApp } = require('./app');
const { pool } = require('./config/database');
// Inicio local o en Render.
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const port = Number(process.env.PORT || 3000);
const server = createApp().listen(port, host, () => {
    console.log(`Portafolio: ${process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${server.address().port}`}`);
});
// Cierre de conexiones.
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await pool?.end(); process.exit(0); }));
