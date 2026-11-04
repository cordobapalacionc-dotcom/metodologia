/** Oportunidades: becas, cursos, empleo, convocatorias y emprendimiento. */
import { api } from './api.js';
import { $, $$, ico, esc, esqueletos, vacio, toast, pedirCuenta, iniciarPagina } from './comun.js';

const usuario = await iniciarPagina();
const lista = $('#listaOp');
const ESTILO = {
  Beca: ['oro', 'birrete'], Curso: ['', 'libro'], Empleo: ['rio', 'maletin'],
  Convocatoria: ['tierra', 'documento'], Emprendimiento: ['oro', 'bombillo'],
};
let ops = [];
let filtro = 'todas';

function pintar() {
  const visibles = ops.filter(o =>
    filtro === 'todas' || (filtro === 'guardadas' ? o.guardada : o.tipo === filtro));
  lista.innerHTML = visibles.map(o => {
    const [color, icono] = ESTILO[o.tipo] || ['', 'birrete'];
    return `
      <article class="card card-flex">
        <div class="ico-caja ${color}">${ico(icono, 'ico-grande')}</div>
        <div><span class="etiqueta ${color}">${esc(o.tipo)}</span></div>
        <h3>${esc(o.titulo)}</h3>
        <p><b>${esc(o.entidad)}</b> · ${esc(o.descripcion)}</p>
        <div class="acciones">
          <a class="btn" href="${esc(o.url)}" target="_blank" rel="noopener">${ico('externo')} Sitio oficial</a>
          <button class="btn ${o.guardada ? 'activo' : 'sec'}" data-guardar="${o.id}" aria-pressed="${o.guardada}">
            ${ico('estrella')} ${o.guardada ? 'Guardada' : 'Guardar'}</button>
        </div>
      </article>`;
  }).join('') || vacio(filtro === 'guardadas' ? 'estrella' : 'buscar',
    filtro === 'guardadas' ? 'Todavía no has guardado oportunidades.' : 'No hay oportunidades en esta categoría.');
}

$('#filtrosOp').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.filtro === 'guardadas' && !usuario) { pedirCuenta('guardar oportunidades'); return; }
  $$('#filtrosOp button').forEach(x => x.setAttribute('aria-pressed', x === b));
  filtro = b.dataset.filtro;
  pintar();
});

lista.addEventListener('click', async e => {
  const b = e.target.closest('[data-guardar]');
  if (!b) return;
  if (!usuario) { pedirCuenta('guardar oportunidades'); return; }
  const o = ops.find(x => x.id === Number(b.dataset.guardar));
  b.disabled = true;
  try {
    const r = await api(`/oportunidades/${o.id}/guardada`, { metodo: o.guardada ? 'DELETE' : 'PUT' });
    o.guardada = r.guardada;
    toast(o.guardada ? 'Guardada en tu lista.' : 'Quitada de tu lista.');
    pintar();
  } catch (err) {
    toast(err.message, 'error');
    b.disabled = false;
  }
});

lista.innerHTML = esqueletos(6);
try {
  ops = await api('/oportunidades');
  pintar();
} catch (e) {
  lista.innerHTML = vacio('wifi-off', e.message);
}
