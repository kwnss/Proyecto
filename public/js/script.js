document.addEventListener("DOMContentLoaded", function () {
    const cuerpo = document.body;
    const botonTema = document.getElementById("boton-tema");
    const botonMenu = document.getElementById("boton-menu");
    const menu = document.getElementById("menu");
    const formulario = document.getElementById("formulario-contacto");

    // Preferencia de tema.
    const temaGuardado = localStorage.getItem("tema");

    if (temaGuardado === "oscuro") {
        cuerpo.classList.add("modo-oscuro");
    }

    actualizarTextoTema();

    botonTema.addEventListener("click", function () {
        cuerpo.classList.toggle("modo-oscuro");

        if (cuerpo.classList.contains("modo-oscuro")) {
            localStorage.setItem("tema", "oscuro");
        } else {
            localStorage.setItem("tema", "claro");
        }

        actualizarTextoTema();
    });

    botonMenu.addEventListener("click", function () {
        const menuAbierto = menu.classList.toggle("abierto");
        botonMenu.setAttribute("aria-expanded", String(menuAbierto));
        botonMenu.setAttribute("aria-label", menuAbierto ? "Cerrar menu" : "Abrir menu");
    });

    menu.addEventListener("click", function (evento) {
        if (evento.target.tagName === "A") {
            menu.classList.remove("abierto");
            botonMenu.setAttribute("aria-expanded", "false");
            botonMenu.setAttribute("aria-label", "Abrir menu");
        }
    });

    formulario.addEventListener("submit", async function (evento) {
        // Validación y envío del formulario.
        evento.preventDefault();

        const nombre = document.getElementById("nombre");
        const correo = document.getElementById("correo");
        const mensaje = document.getElementById("mensaje");
        const mensajeExito = document.getElementById("mensaje-exito");

        let formularioValido = true;

        limpiarErrores();
        mensajeExito.textContent = "";
        mensajeExito.classList.remove("estado-error");

        if (nombre.value.trim() === "") {
            mostrarError(nombre, "El nombre es obligatorio.");
            formularioValido = false;
        }

        if (correo.value.trim() === "") {
            mostrarError(correo, "El correo electronico es obligatorio.");
            formularioValido = false;
        } else if (!validarCorreo(correo.value.trim())) {
            mostrarError(correo, "Escribe un correo electronico valido.");
            formularioValido = false;
        }

        if (mensaje.value.trim() === "") {
            mostrarError(mensaje, "El mensaje es obligatorio.");
            formularioValido = false;
        } else if (mensaje.value.trim().length < 10) {
            mostrarError(mensaje, "El mensaje debe tener al menos 10 caracteres.");
            formularioValido = false;
        }

        if (formularioValido) {
            const boton = formulario.querySelector('button[type="submit"]');
            boton.disabled = true;
            try {
                const respuesta = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: nombre.value, correo: correo.value, mensaje: mensaje.value })
                });
                const resultado = await respuesta.json();
                if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar.');
                mensajeExito.textContent = resultado.message;
                formulario.reset();
            } catch (error) {
                mensajeExito.classList.add("estado-error");
                mensajeExito.textContent = error.message || 'No se pudo conectar. Tu mensaje no se guardo.';
            } finally { boton.disabled = false; }
        }
    });

    function actualizarTextoTema() {
        if (cuerpo.classList.contains("modo-oscuro")) {
            botonTema.textContent = "Modo claro";
        } else {
            botonTema.textContent = "Modo oscuro";
        }
    }

    function mostrarError(campo, mensaje) {
        const contenedor = campo.closest(".campo");
        const error = contenedor.querySelector(".mensaje-error");

        contenedor.classList.add("con-error");
        campo.setAttribute("aria-invalid", "true");
        error.textContent = mensaje;
    }

    function limpiarErrores() {
        const campos = formulario.querySelectorAll(".campo");

        campos.forEach(function (campo) {
            campo.classList.remove("con-error");
            campo.querySelector("input, textarea").removeAttribute("aria-invalid");
            campo.querySelector(".mensaje-error").textContent = "";
        });
    }

    function validarCorreo(correo) {
        const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return patronCorreo.test(correo);
    }
});
