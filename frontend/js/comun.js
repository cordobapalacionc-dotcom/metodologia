/**
 * Utilidades compartidas: iconos, encabezado + navegación, sesión, avisos y modo sin conexión.
 */
import { api } from './api.js';
import { sincronizar } from './cola.js';

export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => [...c.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ico = (nombre, clase = '') =>
  `<svg class="ico ${clase}" aria-hidden="true"><use href="/img/iconos.svg#i-${nombre}"/></svg>`;

export const esqueletos = (n = 4) => Array.from({ length: n }, () => '<div class="esqueleto"></div>').join('');
export const vacio = (icono, texto) => `<div class="vacio">${ico(icono)}<p>${esc(texto)}</p></div>`;

const PAGINAS = [
  { id: 'inicio', url: '/inicio', icono: 'home', nombre: 'Inicio' },
  { id: 'aula', url: '/aula', icono: 'libro', nombre: 'Aula virtual', corto: 'Aula' },
  { id: 'conectividad', url: '/conectividad', icono: 'wifi', nombre: 'Conectividad', corto: 'Mapa' },
  { id: 'recursos', url: '/recursos', icono: 'carpeta', nombre: 'Recursos' },
  { id: 'oportunidades', url: '/oportunidades', icono: 'birrete', nombre: 'Oportunidades', corto: 'Ofertas' },
  { id: 'diagnostico', url: '/diagnostico', icono: 'grafica', nombre: 'Diagnóstico' },
];

/* ---------- Avisos tipo "toast" (reemplazan a alert) ---------- */
export function toast(mensaje, tipo = 'ok') {
  let caja = $('.toasts');
  if (!caja) {
    caja = document.createElement('div');
    caja.className = 'toasts';
    caja.setAttribute('role', 'status');
    caja.setAttribute('aria-live', 'polite');
    document.body.append(caja);
  }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerHTML = ico(tipo === 'error' ? 'alerta' : 'check') + `<span>${esc(mensaje)}</span>`;
  caja.append(t);
  setTimeout(() => t.remove(), 3800);
}

/* ---------- Sesión ---------- */
const CLAVE_USUARIO = 'qc_usuario';

export const iniciales = nombre => nombre.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();

export function recordarUsuario(u) {
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u));
  sessionStorage.removeItem('qc_invitado');
}

/** Usuario actual, o null. Sin conexión usa el último usuario conocido. */
export async function obtenerUsuario() {
  try {
    const { usuario } = await api('/auth/yo');
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    return usuario;
  } catch (e) {
    if (e.estado === 401) { localStorage.removeItem(CLAVE_USUARIO); return null; }
    try { return JSON.parse(localStorage.getItem(CLAVE_USUARIO)); } catch { return null; }
  }
}

async function cerrarSesion() {
  await api('/auth/logout', { metodo: 'POST' }).catch(() => {});
  localStorage.removeItem(CLAVE_USUARIO);
  sessionStorage.removeItem('qc_invitado');
  if ('caches' in window) await caches.delete('qc-api'); // datos personales guardados sin conexión
  location.href = '/';
}

/**
 * Prepara cualquier página interna: verifica sesión (o modo invitado),
 * dibuja encabezado y navegación y activa el modo sin conexión.
 */
export async function iniciarPagina() {
  const usuario = await obtenerUsuario();
  if (!usuario && !sessionStorage.getItem('qc_invitado')) {
    location.replace('/');
    return new Promise(() => {}); // detiene la página mientras redirige
  }
  pintarCabecera(usuario);
  registrarServiceWorker();
  enviarPendientes(usuario);
  addEventListener('online', () => enviarPendientes(usuario));
  return usuario;
}

/** Envía los diagnósticos guardados sin conexión y avisa cuántos se enviaron. */
async function enviarPendientes(usuario) {
  const n = await sincronizar(usuario);
  if (n) toast(n === 1 ? 'Se envió 1 diagnóstico guardado sin conexión.' : `Se enviaron ${n} diagnósticos guardados sin conexión.`);
}

function pintarCabecera(usuario) {
  const actual = document.body.dataset.pagina;
  const nombre = usuario?.nombre.split(' ')[0];
  const iniciales = usuario?.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  $('#cabecera').innerHTML = `
    <div class="marca">
      <a class="logo-enlace" href="/inicio" aria-label="Quibdó Conecta, ir al inicio">
        <div class="logo">${ico('logo')}</div>
        <div><h1>Quibdó Conecta</h1><p>Aprender, conectarse y encontrar oportunidades</p></div>
      </a>
      <div class="marca-der">
        <span class="estado" id="estadoRed"></span>
        <div class="usuario">
          ${usuario
            ? `<a class="usuario-enlace ${actual === 'perfil' ? 'activo' : ''}" href="/perfil" title="Mi panel: mi avance y mis datos"
                  ${actual === 'perfil' ? 'aria-current="page"' : ''}>
                 <div class="avatar" aria-hidden="true">${esc(iniciales)}</div>
                 <div class="usuario-nombre">${esc(nombre)}<small>Mi panel</small></div>
               </a>
               ${usuario.rol === 'admin'
                 ? `<a class="btn-cabecera ${actual === 'admin' ? 'activo' : ''}" href="/admin" title="Panel de administración">${ico('escudo')}<span class="estado-texto">Admin</span></a>`
                 : ''}
               <button class="btn-cabecera" id="btnSalir" title="Cerrar sesión">${ico('salir')}<span class="estado-texto">Salir</span></button>`
            : `<div class="avatar" aria-hidden="true">${ico('usuario')}</div>
               <div class="usuario-nombre">Invitado<small>Sin cuenta</small></div>
               <a class="btn-cabecera" href="/?registro">${ico('usuario-mas')}<span>Crear cuenta</span></a>`}
        </div>
      </div>
    </div>
    <nav class="nav" aria-label="Secciones">
      ${PAGINAS.map(p => `
        <a href="${p.url}" ${p.id === actual ? 'aria-current="page"' : ''}>
          ${ico(p.icono)}
          ${p.corto
            ? `<span class="nav-texto-largo">${p.nombre}</span><span class="nav-texto-corto">${p.corto}</span>`
            : `<span>${p.nombre}</span>`}
        </a>`).join('')}
    </nav>`;

  $('#btnSalir')?.addEventListener('click', cerrarSesion);
  pintarRed();
  addEventListener('online', () => { pintarRed(); toast('Conexión recuperada.'); });
  addEventListener('offline', () => { pintarRed(); toast('Sin conexión: verás el contenido guardado.', 'error'); });
}

function pintarRed() {
  const el = $('#estadoRed');
  if (!el) return;
  const online = navigator.onLine;
  el.classList.toggle('offline', !online);
  el.innerHTML = online ? `${ico('wifi')}<span class="estado-texto">En línea</span>`
                        : `${ico('wifi-off')}<span class="estado-texto">Sin conexión</span>`;
}

export function registrarServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

/** Mensaje estándar cuando una acción necesita cuenta. */
export const pedirCuenta = accion => toast(`Crea una cuenta o inicia sesión para ${accion}.`, 'error');
