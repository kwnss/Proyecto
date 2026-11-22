# Mi portafolio

Soy Kensy Bautista Ramirez. Me gradué del CBTIS 114 como técnico en Programación y estudio Ingeniería en Sistemas Electrónicos Inteligentes en la UACJ.

En mi portafolio comparto mi formación, mi servicio social como ADi y mis proyectos. Tiene modo oscuro, menú móvil, formulario de contacto, acceso con GitHub y conexión a PostgreSQL.

## Para ejecutarlo

Necesito Node.js 20 o superior, npm y PostgreSQL.

1. Instalar las dependencias con `npm ci`.
2. Copiar `.env.example` a `.env` si todavía no existe.
3. Completar `DATABASE_URL`, `SESSION_SECRET`, `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` en `.env`.
4. Crear la base y ejecutar:

```powershell
createdb -h localhost -U postgres portafolio
npm run db:init
npm start
```

Abro el proyecto en http://localhost:3000. Para generar un secreto de sesión puedo usar:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Acceso con GitHub

Registro una OAuth App en https://github.com/settings/developers con estas direcciones:

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/auth/github/callback`

Guardo las credenciales en `.env` y reinicio el servidor. Ese archivo es privado y no se sube al repositorio.

## Archivos principales

- `public/`: HTML, CSS, JavaScript y foto. Aquí edito lo que aparece en la página.
- `app.js` y `server.js`: servidor y rutas de la API.
- `config/` y `db/`: conexión, tablas y proyectos iniciales.
- `test/`: pruebas que ejecuto con `npm test`.

Los proyectos se consultan con `GET /api/projects` y el formulario envía los mensajes a `POST /api/contact`. Si la base no está disponible, el sitio muestra un error y no confirma un guardado.

## Publicar en Render

1. Subo los cambios del proyecto a GitHub.
2. En https://dashboard.render.com/ elijo **New > Blueprint** y selecciono este repositorio. `render.yaml` prepara el servidor y una base PostgreSQL con el plan Free.
3. Completo `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` con los valores de mi OAuth App. No copio el `.env` local completo: Render genera su secreto de sesión y su conexión a la base.
4. Cuando Render me da la URL pública, la registro como Homepage de la OAuth App y agrego su dirección terminada en `/auth/github/callback` como callback. Conservo el callback local si también voy a usarlo en mi laptop.
5. Compruebo `/api/health`, el acceso con GitHub y el formulario desde el enlace público.

El servidor crea las tablas al iniciar. Usa `RENDER_EXTERNAL_URL` para las redirecciones OAuth y cookies seguras en producción. Para un dominio propio completo `APP_URL` con su dirección HTTPS.

El servicio Free puede tardar alrededor de un minuto en despertar después de un tiempo sin visitas. La base PostgreSQL Free vence a los 30 días. No necesito contratar un plan de pago para esta configuración.

El enlace de GitHub sirve para revisar el código; el enlace de Render permite usar la aplicación.
