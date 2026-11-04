/**
 * Mapa de conectividad con Leaflet + OpenStreetMap.
 * Leaflet se carga como script clásico (variable global L) desde /vendor/leaflet.
 */
import { api } from './api.js';
import { $, $$, ico, esc, toast, iniciarPagina } from './comun.js';

const usuario = await iniciarPagina();

const CENTRO = [5.6935, -76.6560]; // Quibdó
const COLOR = { wifi: '#16a34a', comunitario: '#2563eb', zona: '#dc2626' };
const TIPOS = {
  wifi: ['Wi-Fi gratuito', 'wifi'],
  comunitario: ['Acceso comunitario', 'usuarios'],
  zona: ['Zona con dificultad', 'wifi-off'],
};

let puntos = [];
let filtro = 'todos';
let ubicando = false;
let nuevo = null;        // {lat, lng} del reporte
let miPosicion = null;   // {lat, lng} del usuario
const capasPorId = new Map();

/* ---------- Mapa ---------- */
const divMapa = $('#mapa');
if (!window.L) {
  $('#mapaError').hidden = false;
  $('#mapaError').textContent = 'No se pudo cargar el mapa. Revisa tu conexión; mientras tanto puedes ver la lista de puntos abajo.';
}
const mapa = window.L ? L.map(divMapa, { zoomControl: true }).setView(CENTRO, 14) : null;

if (mapa) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true, // permite guardar las teselas en caché para usarlas sin conexión
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(mapa);
}
const capaPuntos = mapa ? L.layerGroup().addTo(mapa) : null;
let marcadorNuevo = null;
let marcadorYo = null;

/* ---------- Utilidades ---------- */
function distanciaM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const textoDistancia = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

/* ---------- Puntos ---------- */
async function cargar() {
  try {
    puntos = await api('/puntos');
    pintar();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function visibles() {
  return puntos.filter(p => filtro === 'todos' || p.tipo === filtro);
}

function pintar() {
  if (capaPuntos) {
    capaPuntos.clearLayers();
    capasPorId.clear();
    for (const p of visibles()) {
      const c = COLOR[p.tipo];
      const capa = p.tipo === 'zona'
        ? L.circle([p.lat, p.lng], {
            radius: p.radio || 400, color: c, weight: 2, fillColor: c, fillOpacity: 0.2,
            dashArray: p.verificado ? null : '6 5' })
        : L.circleMarker([p.lat, p.lng], {
            radius: 9, weight: 3,
            color: p.verificado ? '#fff' : c, fillColor: p.verificado ? c : '#fff', fillOpacity: 1,
            dashArray: p.verificado ? null : '3 3' });
      capa.bindTooltip(p.nombre, { direction: 'top', offset: [0, -8] });
      capa.on('click', ev => {
        if (ubicando) return; // el clic lo maneja el mapa (ubicar reporte)
        L.DomEvent.stopPropagation(ev);
        detalle(p.id);
      });
      capa.addTo(capaPuntos);
      capasPorId.set(p.id, capa);
    }
  }
  pintarLista();
}

function pintarLista() {
  const lista = visibles().map(p => ({ ...p, dist: miPosicion ? distanciaM(miPosicion, p) : null }));
  if (miPosicion) lista.sort((a, b) => a.dist - b.dist);
  $('#ordenLista').textContent = miPosicion ? '(ordenados por cercanía)' : '';
  $('#listaPuntos').innerHTML = lista.map(p => `
    <li><button data-id="${p.id}">
      <span class="punto-ley" style="background:${COLOR[p.tipo]}"></span>
      <span class="nombre">${esc(p.nombre)}<small>${TIPOS[p.tipo][0]}${p.verificado ? '' : ' · por verificar'}</small></span>
      ${p.dist != null ? `<span class="dist">${textoDistancia(p.dist)}</span>` : ''}
    </button></li>`).join('') || '<li class="vacio">No hay puntos en esta categoría.</li>';
}

function detalle(id, centrar = false) {
  const p = puntos.find(x => x.id === id);
  if (!p) return;
  const [nombreTipo, icono] = TIPOS[p.tipo];
  const dist = miPosicion ? ` · a ${textoDistancia(distanciaM(miPosicion, p))} de ti` : '';
  $('#detallePunto').innerHTML = `
    <span class="etiqueta" style="background:${COLOR[p.tipo]}1f;color:${COLOR[p.tipo]}">${ico(icono)} ${nombreTipo}</span>
    ${p.verificado ? '' : `<span class="etiqueta oro">${ico('usuario')} Reporte de ${esc(p.autor || 'la comunidad')} · por verificar</span>`}
    <h3>${ico('pin')} ${esc(p.nombre)}</h3>
    <p>${esc(p.descripcion || '')}${esc(dist)}</p>
    ${p.horario ? `<p><b>Horario:</b> ${esc(p.horario)}</p>` : ''}
    <p><b>Calidad de señal:</b> ${esc(p.senal || 'Sin dato')}</p>
    <a class="btn sec" href="https://www.openstreetmap.org/directions?route=${miPosicion ? `${miPosicion.lat},${miPosicion.lng}` : ''};${p.lat},${p.lng}"
       target="_blank" rel="noopener">${ico('externo')} Cómo llegar</a>`;
  if (mapa) {
    const capa = capasPorId.get(id);
    capa?.openTooltip();
    if (centrar) mapa.setView([p.lat, p.lng], Math.max(mapa.getZoom(), 16));
  }
}

$('#listaPuntos').addEventListener('click', e => {
  const b = e.target.closest('[data-id]');
  if (!b) return;
  detalle(Number(b.dataset.id), true);
  divMapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* ---------- Filtros ---------- */
$('#filtrosMapa').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('#filtrosMapa button').forEach(x => x.setAttribute('aria-pressed', x === b));
  filtro = b.dataset.filtro;
  pintar();
});

/* ---------- Mi ubicación y punto más cercano ---------- */
function obtenerPosicion() {
  return new Promise((ok, falla) => {
    if (!navigator.geolocation) return falla(new Error('Tu dispositivo no permite conocer la ubicación.'));
    navigator.geolocation.getCurrentPosition(
      pos => ok({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => falla(new Error(err.code === 1 ? 'Debes permitir el acceso a tu ubicación.' : 'No se pudo obtener tu ubicación.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

$('#btnMiUbicacion').addEventListener('click', async e => {
  const boton = e.currentTarget;
  boton.disabled = true;
  try {
    miPosicion = await obtenerPosicion();
    if (mapa) {
      marcadorYo?.remove();
      marcadorYo = L.marker([miPosicion.lat, miPosicion.lng], {
        icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [18, 18] }),
        title: 'Tu ubicación', keyboard: false,
      }).addTo(mapa);
      mapa.setView([miPosicion.lat, miPosicion.lng], 15);
    }
    // Punto con acceso más cercano
    const conAcceso = puntos.filter(p => p.tipo !== 'zona')
      .map(p => ({ ...p, dist: distanciaM(miPosicion, p) })).sort((a, b) => a.dist - b.dist);
    const c = conAcceso[0];
    $('#cercano').hidden = !c;
    if (c) {
      $('#cercano').innerHTML = `
        <h3>${ico('wifi')} Lo más cercano a ti</h3>
        <p><b>${esc(c.nombre)}</b>, a <b>${textoDistancia(c.dist)}</b>. ${TIPOS[c.tipo][0]}${c.verificado ? '' : ' (por verificar)'}.</p>
        <button class="btn sec" data-ver="${c.id}">Ver en el mapa</button>`;
    }
    if (c && c.dist > 50000) toast('Pareces estar lejos de Quibdó: las distancias pueden no ser útiles.', 'error');
    pintarLista();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
});
$('#cercano').addEventListener('click', e => {
  const b = e.target.closest('[data-ver]');
  if (b) detalle(Number(b.dataset.ver), true);
});

/* ---------- Reportes ---------- */
function marcarNuevo(lat, lng) {
  nuevo = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
  if (mapa) {
    marcadorNuevo?.remove();
    marcadorNuevo = L.circleMarker([nuevo.lat, nuevo.lng], {
      radius: 11, color: '#0f5132', weight: 3, fillColor: '#f2b705', fillOpacity: 1,
    }).addTo(mapa);
  }
  $('#estadoUbicacion').innerHTML = `${ico('check')} Ubicación marcada`;
}

function activarUbicacion(activo) {
  ubicando = activo;
  divMapa.classList.toggle('ubicando', activo);
  $('#indicacionMapa').hidden = !activo;
  $('#btnUbicar').classList.toggle('activo', activo);
  if (activo) divMapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

mapa?.on('click', e => {
  if (!ubicando) return;
  marcarNuevo(e.latlng.lat, e.latlng.lng);
  activarUbicacion(false);
});

if (!usuario) {
  $('#formReporte').innerHTML = `
    <p>Para reportar un punto necesitas una cuenta. Así evitamos reportes falsos.</p>
    <a class="btn" href="/?registro">${ico('usuario-mas')} Crear cuenta</a>`;
} else {
  $('#btnUbicar').addEventListener('click', () => {
    if (!mapa) return toast('El mapa no está disponible sin conexión. Usa "Estoy aquí".', 'error');
    activarUbicacion(!ubicando);
  });
  $('#btnUbicarAqui').addEventListener('click', async () => {
    try {
      const pos = await obtenerPosicion();
      marcarNuevo(pos.lat, pos.lng);
      mapa?.setView([pos.lat, pos.lng], 16);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  $('#formReporte').addEventListener('submit', async e => {
    e.preventDefault();
    if (!nuevo) { toast('Primero marca el lugar en el mapa o usa "Estoy aquí".', 'error'); return; }
    const boton = $('button[type=submit]', e.target);
    boton.disabled = true;
    try {
      await api('/puntos', { metodo: 'POST', datos: { nombre: $('#repLugar').value, tipo: $('#repTipo').value, ...nuevo } });
      toast('¡Gracias! Tu reporte quedó en el mapa, pendiente de verificación.');
      e.target.reset();
      nuevo = null;
      marcadorNuevo?.remove();
      $('#estadoUbicacion').textContent = '';
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      boton.disabled = false;
    }
  });
}

cargar();
