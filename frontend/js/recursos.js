/** Banco de recursos: guías descargables para usar sin conexión. */
import { api } from './api.js';
import { $, ico, esc, esqueletos, vacio, toast, iniciarPagina } from './comun.js';

await iniciarPagina();
const lista = $('#listaRecursos');
let recursos = [];

function pintar() {
  const q = $('#buscarRecurso').value.trim().toLowerCase();
  const visibles = recursos.filter(r => !q || `${r.titulo} ${r.tema} ${r.resumen}`.toLowerCase().includes(q));
  lista.innerHTML = visibles.map(r => `
    <article class="card card-flex">
      <div class="ico-caja tierra">${ico(r.icono, 'ico-grande')}</div>
      <div>
        <span class="etiqueta">${esc(r.tema)}</span><span class="etiqueta tierra">${esc(r.tipo)}</span>
        ${r.descargado ? `<span class="etiqueta oro">${ico('check')} Descargado</span>` : ''}
      </div>
      <h3>${esc(r.titulo)}</h3>
      <p>${esc(r.resumen)}…</p>
      <div class="acciones">
        <a class="btn" href="/api/recursos/${r.id}/descargar" data-id="${r.id}" download>${ico('descargar')} Descargar</a>
        <small style="color:var(--suave)">.${esc(r.extension)} · ${(r.tamano / 1024).toFixed(1)} KB</small>
      </div>
    </article>`).join('') || vacio('buscar', 'No se encontraron guías con esa búsqueda.');
}

lista.addEventListener('click', e => {
  const a = e.target.closest('[data-id]');
  if (!a) return;
  const r = recursos.find(x => x.id === Number(a.dataset.id));
  if (r && !r.descargado) { r.descargado = true; setTimeout(pintar, 300); }
  toast('Descarga iniciada. Podrás abrir el archivo sin Internet.');
});

$('#buscarRecurso').addEventListener('input', pintar);

lista.innerHTML = esqueletos(6);
try {
  recursos = await api('/recursos');
  pintar();
} catch (e) {
  lista.innerHTML = vacio('wifi-off', e.message);
}
