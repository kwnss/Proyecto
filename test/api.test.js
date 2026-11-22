const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');

test('HTTP: pagina, proyectos, validacion, persistencia y fallos controlados', async () => {
    // Esta base simulada verifica las rutas sin utilizar credenciales ni un servicio externo.
    const calls = [];
    const db = { async query(sql, values) {
        calls.push({ sql, values });
        if (sql.startsWith('INSERT')) return { rows: [{ id: 42 }] };
        return { rows: [{ id: 1, title: 'Proyecto', description: 'Descripcion' }] };
    } };
    const server = createApp(db).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    try {
        assert.match(await fetch(url).then(response => response.text()), /Portafolio Full Stack/);
        assert.equal((await fetch(`${url}/api/projects`).then(response => response.json())).projects[0].title, 'Proyecto');
        assert.equal((await fetch(`${url}/api/me`).then(response => response.json())).user, null);
        assert.equal((await fetch(`${url}/auth/github/callback?code=fake&state=fake`)).status, 400);
        const post = body => fetch(`${url}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        assert.equal((await post({})).status, 400);
        assert.equal((await post({ nombre: 'Ana', correo: 'invalido', mensaje: 'Mensaje de prueba' })).status, 400);
        const result = await post({ nombre: "Ana O'Connor", correo: 'ana@example.com', mensaje: 'Mensaje de prueba' });
        assert.equal(result.status, 201);
        assert.equal((await result.json()).id, 42);
        assert.equal(calls.find(call => call.sql.startsWith('INSERT')).values[0], "Ana O'Connor");
        // El error deliberado comprueba que los detalles internos no se filtren en la respuesta.
        db.query = async () => { throw new Error('secret-password'); };
        const failure = await fetch(`${url}/api/projects`);
        assert.equal(failure.status, 503);
        assert.doesNotMatch(await failure.text(), /secret-password/);
        assert.equal((await fetch(`${url}/api/health`)).status, 503);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
