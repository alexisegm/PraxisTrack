/**
 * Barra de notificaciones de PraxisTrack.
 * Solo frontend: deriva las respuestas de las empresas desde GET /postulaciones.
 */
(() => {
    const ESTADOS_CON_RESPUESTA = {
        Seleccionado: {
            icono: '✅',
            tipo: 'success',
            titulo: 'Fuiste seleccionado',
            mensaje: oferta => `La empresa te seleccionó para «${oferta}». Revisa los siguientes pasos.`
        },
        Rechazado: {
            icono: '❌',
            tipo: 'danger',
            titulo: 'Postulación no seleccionada',
            mensaje: oferta => `La empresa respondió a tu postulación de «${oferta}». Puedes seguir postulando.`
        }
    };

    const INTERVALO_ACTUALIZACION = 60000;
    const ui = {
        boton: null,
        panel: null,
        badge: null,
        wrapper: null,
        lista: null
    };
    const estado = {
        notificaciones: [],
        leidas: new Set(),
        userId: 'sesion',
        abierto: false,
        cargando: false
    };

    function escaparHTML(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[caracter]));
    }

    function claveStorage() {
        return `praxistrack_notificaciones_vistas_${estado.userId}`;
    }

    function cargarLeidas() {
        try {
            const guardadas = JSON.parse(localStorage.getItem(claveStorage()) || '[]');
            estado.leidas = new Set(Array.isArray(guardadas) ? guardadas : []);
        } catch {
            estado.leidas = new Set();
        }
    }

    function guardarLeidas() {
        try {
            const clavesActuales = new Set(estado.notificaciones.map(notificacion => notificacion.clave));
            const leidasActuales = [...estado.leidas].filter(clave => clavesActuales.has(clave));
            localStorage.setItem(claveStorage(), JSON.stringify(leidasActuales));
        } catch {
            // Si el navegador bloquea localStorage, la barra sigue funcionando en memoria.
        }
    }

    function obtenerSubDelToken(token) {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
            const payload = JSON.parse(atob(base64 + relleno));
            return payload.sub || null;
        } catch {
            return null;
        }
    }

    function inyectarEstilos() {
        if (document.getElementById('praxi-notif-styles')) return;

        const estilo = document.createElement('style');
        estilo.id = 'praxi-notif-styles';
        estilo.textContent = `
            .praxi-notif-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
            }

            .praxi-notif-badge {
                position: absolute;
                top: -4px;
                right: -7px;
                min-width: 17px;
                height: 17px;
                padding: 0 4px;
                border-radius: 999px;
                background-color: var(--accent-amber, #ffa733);
                color: var(--on-accent, #2b1008);
                font-size: 0.65rem;
                font-weight: 800;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 0 2px rgba(58, 19, 21, 0.92);
                pointer-events: none;
            }

            .praxi-notif-badge[hidden] {
                display: none;
            }

            .praxi-notif-panel {
                position: absolute;
                top: calc(100% + 0.7rem);
                right: 0;
                width: min(360px, calc(100vw - 2rem));
                background-color: var(--bg-elevated, #3a1315);
                border: 1px solid var(--border-color, #6a2a22);
                border-radius: 12px;
                box-shadow: 0 24px 50px -18px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 231, 209, 0.04);
                color: var(--text-main, #f7eee7);
                z-index: 300;
                overflow: hidden;
                animation: praxiNotifIn 0.16s ease-out;
            }

            .praxi-notif-panel[hidden] {
                display: none;
            }

            @keyframes praxiNotifIn {
                from {
                    opacity: 0;
                    transform: translateY(-6px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .praxi-notif-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.75rem;
                padding: 0.9rem 1rem;
                border-bottom: 1px solid var(--border-color, #6a2a22);
            }

            .praxi-notif-head strong {
                font-size: 0.95rem;
            }

            .praxi-notif-read {
                background: none;
                border: 0;
                color: var(--accent-amber, #ffa733);
                font-family: inherit;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                padding: 0.2rem;
            }

            .praxi-notif-read:hover {
                text-decoration: underline;
            }

            .praxi-notif-list {
                max-height: min(420px, calc(100vh - 160px));
                overflow-y: auto;
            }

            .praxi-notif-item {
                display: flex;
                gap: 0.7rem;
                padding: 0.85rem 1rem;
                border-bottom: 1px solid var(--border-soft, rgba(197, 146, 102, 0.16));
                text-decoration: none;
                color: inherit;
                transition: background-color 0.15s ease;
            }

            .praxi-notif-item:last-child {
                border-bottom: 0;
            }

            .praxi-notif-item:hover {
                background-color: rgba(255, 167, 51, 0.08);
            }

            .praxi-notif-item.is-unread {
                background-color: rgba(255, 167, 51, 0.07);
            }

            .praxi-notif-icon {
                flex: 0 0 auto;
                font-size: 1.15rem;
                line-height: 1.3;
            }

            .praxi-notif-body {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
                min-width: 0;
                flex: 1;
            }

            .praxi-notif-title {
                font-size: 0.85rem;
                font-weight: 700;
            }

            .praxi-notif-item.is-success .praxi-notif-title {
                color: var(--success-color, #c59266);
            }

            .praxi-notif-item.is-danger .praxi-notif-title {
                color: var(--danger-color, #d96a4a);
            }

            .praxi-notif-text {
                font-size: 0.78rem;
                color: var(--text-muted, #d2b3a5);
                line-height: 1.4;
            }

            .praxi-notif-meta {
                font-size: 0.7rem;
                color: var(--text-muted, #d2b3a5);
                opacity: 0.75;
            }

            .praxi-notif-dot {
                align-self: center;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: var(--accent-amber, #ffa733);
                flex: 0 0 auto;
            }

            .praxi-notif-empty {
                padding: 1.4rem 1rem;
                text-align: center;
                font-size: 0.82rem;
                color: var(--text-muted, #d2b3a5);
                line-height: 1.5;
            }

            .praxi-notif-empty span {
                display: block;
                font-size: 0.75rem;
                opacity: 0.8;
                margin-top: 0.25rem;
            }

            @media (prefers-reduced-motion: reduce) {
                .praxi-notif-panel {
                    animation: none;
                }
            }
        `;

        document.head.appendChild(estilo);
    }

    function crearInterfaz() {
        const boton = document.getElementById('btn-notificaciones')
            || [...document.querySelectorAll('.icon-btn')].find(elemento => elemento.textContent.includes('🔔'));

        if (!boton) return false;

        const wrapper = document.createElement('div');
        wrapper.className = 'praxi-notif-wrapper';
        boton.parentNode.insertBefore(wrapper, boton);
        wrapper.appendChild(boton);

        boton.setAttribute('aria-label', 'Notificaciones');
        boton.setAttribute('aria-haspopup', 'true');
        boton.setAttribute('aria-expanded', 'false');

        const badge = document.createElement('span');
        badge.className = 'praxi-notif-badge';
        badge.hidden = true;
        wrapper.appendChild(badge);

        const panel = document.createElement('div');
        panel.className = 'praxi-notif-panel';
        panel.hidden = true;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'Notificaciones');
        panel.innerHTML = `
            <div class="praxi-notif-head">
                <strong>Notificaciones</strong>
                <button type="button" class="praxi-notif-read" data-accion="marcar">Marcar leídas</button>
            </div>
            <div class="praxi-notif-list" data-lista>
                <div class="praxi-notif-empty">Cargando notificaciones...</div>
            </div>
        `;
        wrapper.appendChild(panel);

        ui.boton = boton;
        ui.panel = panel;
        ui.badge = badge;
        ui.wrapper = wrapper;
        ui.lista = panel.querySelector('[data-lista]');

        return true;
    }

    function actualizarBadge() {
        const noLeidas = estado.notificaciones.filter(notificacion => !estado.leidas.has(notificacion.clave)).length;
        ui.badge.textContent = noLeidas > 9 ? '9+' : String(noLeidas);
        ui.badge.hidden = noLeidas === 0;
    }

    function formatearFecha(fecha) {
        if (!fecha) return '';
        const fechaObjeto = new Date(fecha);
        if (Number.isNaN(fechaObjeto.getTime())) return '';
        return fechaObjeto.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function renderizarLista() {
        if (!estado.notificaciones.length) {
            ui.lista.innerHTML = `
                <div class="praxi-notif-empty">
                    No tienes notificaciones por ahora.
                    <span>Cuando una empresa responda a tus postulaciones, aparecerá aquí.</span>
                </div>
            `;
            return;
        }

        ui.lista.innerHTML = estado.notificaciones.map(notificacion => {
            const noLeida = !estado.leidas.has(notificacion.clave);
            return `
                <a class="praxi-notif-item ${noLeida ? 'is-unread' : ''} is-${notificacion.tipo}" href="postulaciones.html">
                    <span class="praxi-notif-icon" aria-hidden="true">${notificacion.icono}</span>
                    <span class="praxi-notif-body">
                        <span class="praxi-notif-title">${escaparHTML(notificacion.titulo)}</span>
                        <span class="praxi-notif-text">${escaparHTML(notificacion.mensaje)}</span>
                        <span class="praxi-notif-meta">${escaparHTML(formatearFecha(notificacion.fecha))}</span>
                    </span>
                    ${noLeida ? '<span class="praxi-notif-dot" aria-label="No leída"></span>' : ''}
                </a>
            `;
        }).join('');

        ui.lista.querySelectorAll('.praxi-notif-item').forEach(enlace => {
            enlace.addEventListener('click', marcarTodasLeidas);
        });
    }

    function marcarTodasLeidas() {
        if (!estado.notificaciones.length) return;

        estado.notificaciones.forEach(notificacion => estado.leidas.add(notificacion.clave));
        guardarLeidas();
        actualizarBadge();

        ui.lista.querySelectorAll('.praxi-notif-item').forEach(item => {
            item.classList.remove('is-unread');
            const punto = item.querySelector('.praxi-notif-dot');
            if (punto) punto.remove();
        });
    }

    async function cargarNotificaciones() {
        if (estado.cargando) return;
        estado.cargando = true;

        try {
            const token = await window.PRAXISTRACK_CONFIG.getAccessToken();

            if (!token) {
                estado.notificaciones = [];
                estado.leidas = new Set();
                estado.userId = 'sesion';
                ui.lista.innerHTML = `
                    <div class="praxi-notif-empty">
                        Inicia sesión para ver tus notificaciones.
                        <span><a href="auth.html" style="color: var(--accent-amber, #ffa733);">Accede a tu cuenta</a> y consulta las respuestas de las empresas.</span>
                    </div>
                `;
                actualizarBadge();
                return;
            }

            const [perfil, postulaciones] = await Promise.all([
                ApiClient.get('/perfil').then(respuesta => respuesta.data).catch(() => null),
                ApiClient.get('/postulaciones').then(respuesta => respuesta.data || []).catch(() => null)
            ]);

            estado.userId = perfil?.id || obtenerSubDelToken(token) || 'sesion';
            cargarLeidas();

            if (postulaciones === null) {
                ui.lista.innerHTML = `
                    <div class="praxi-notif-empty">
                        No se pudieron cargar las notificaciones.
                        <span>Vuelve a intentarlo en unos momentos.</span>
                    </div>
                `;
                actualizarBadge();
                return;
            }

            if (perfil?.rol && perfil.rol !== 'Estudiante') {
                estado.notificaciones = [];
                ui.lista.innerHTML = `
                    <div class="praxi-notif-empty">
                        No hay notificaciones para este perfil.
                        <span>Las respuestas de selección se muestran a las cuentas de estudiante.</span>
                    </div>
                `;
                actualizarBadge();
                return;
            }

            estado.notificaciones = postulaciones
                .filter(postulacion => ESTADOS_CON_RESPUESTA[postulacion.estado_actual])
                .map(postulacion => {
                    const configuracion = ESTADOS_CON_RESPUESTA[postulacion.estado_actual];
                    const oferta = postulacion.titulo_oferta || 'Oferta de pasantía';
                    return {
                        clave: `${postulacion.id_postulacion}:${postulacion.estado_actual}`,
                        titulo: configuracion.titulo,
                        mensaje: configuracion.mensaje(oferta),
                        icono: configuracion.icono,
                        tipo: configuracion.tipo,
                        fecha: postulacion.fecha_registro
                    };
                });

            renderizarLista();
            actualizarBadge();
        } catch (error) {
            ui.lista.innerHTML = `
                <div class="praxi-notif-empty">
                    No se pudieron cargar las notificaciones.
                    <span>${escaparHTML(error.message || 'Inténtalo de nuevo más tarde.')}</span>
                </div>
            `;
        } finally {
            estado.cargando = false;
        }
    }

    function abrirPanel() {
        estado.abierto = true;
        ui.panel.hidden = false;
        ui.boton.setAttribute('aria-expanded', 'true');
        cargarNotificaciones();
    }

    function cerrarPanel() {
        if (!estado.abierto) return;
        estado.abierto = false;
        ui.panel.hidden = true;
        ui.boton.setAttribute('aria-expanded', 'false');
        marcarTodasLeidas();
    }

    function alternarPanel() {
        if (estado.abierto) {
            cerrarPanel();
        } else {
            abrirPanel();
        }
    }

    function conectarEventos() {
        ui.boton.addEventListener('click', evento => {
            evento.stopPropagation();
            alternarPanel();
        });

        ui.panel.querySelector('[data-accion="marcar"]').addEventListener('click', evento => {
            evento.stopPropagation();
            marcarTodasLeidas();
        });

        document.addEventListener('click', evento => {
            if (estado.abierto && !ui.wrapper.contains(evento.target)) {
                cerrarPanel();
            }
        });

        document.addEventListener('keydown', evento => {
            if (evento.key === 'Escape') {
                cerrarPanel();
            }
        });

        window.addEventListener('focus', cargarNotificaciones);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) cargarNotificaciones();
        });
    }

    function iniciar() {
        inyectarEstilos();
        if (!crearInterfaz()) return;

        conectarEventos();
        cargarNotificaciones();
        setInterval(() => {
            if (!document.hidden) cargarNotificaciones();
        }, INTERVALO_ACTUALIZACION);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
