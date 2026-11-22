document.addEventListener('DOMContentLoaded', async () => {
    const estado = document.getElementById('estado-servicios');
    const sesion = document.getElementById('estado-sesion');
    const acceso = document.getElementById('acceso-github');
    const salir = document.getElementById('salir');
    try {
        // Datos de la API.
        const health = await fetch('/api/health').then(response => response.json());
        estado.textContent = health.database === 'connected' ? 'PostgreSQL conectado. API disponible.' : 'PostgreSQL pendiente de configurar. Los mensajes no pueden guardarse todavia.';
        const identity = await fetch('/api/me').then(response => response.json());
        sesion.textContent = identity.user ? `Sesion: ${identity.user.name}` : 'Puedes iniciar sesion con GitHub.';
        acceso.hidden = Boolean(identity.user) || !identity.oauthConfigured;
        salir.hidden = !identity.user;
        if (!identity.oauthConfigured) sesion.textContent = 'Acceso con GitHub pendiente de configurar (consulta README).';
        const response = await fetch('/api/projects');
        if (response.ok) {
            const { projects } = await response.json();
            const contenedor = document.querySelector('#proyectos .grid-tarjetas');
            // Tarjetas de proyectos.
            contenedor.replaceChildren(...projects.map(project => {
                const article = document.createElement('article');
                article.className = 'tarjeta';
                const title = document.createElement('h3');
                const description = document.createElement('p');
                title.textContent = project.title;
                description.textContent = project.description;
                article.append(title, description);
                return article;
            }));
        }
    } catch { estado.textContent = 'No se pudo conectar al servidor. Abre el sitio desde http://localhost:3000.'; }
    salir.addEventListener('click', async () => {
        try {
            const response = await fetch('/auth/logout', { method: 'POST' });
            if (!response.ok) throw new Error();
            location.reload();
        } catch { sesion.textContent = 'No se pudo cerrar la sesion. Intenta otra vez.'; }
    });
});
