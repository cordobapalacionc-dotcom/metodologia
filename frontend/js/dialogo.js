/**
 * Ventana de diálogo compartida por los paneles (admin y facilitador).
 * La página debe tener el <dialog id="dialogo"> con su formulario.
 */
import { $, $$, esc, toast } from './comun.js';

const dialogo = $('#dialogo');
let alGuardar = null;

/**
 * Abre el diálogo con un formulario.
 *   guardar(FormData) → promesa; si falla, el error se muestra dentro del diálogo.
 *   Sin guardar, el diálogo es solo informativo (un botón "Cerrar").
 */
export function abrirDialogo(titulo, html, guardar = null) {
  $('#dialogoTitulo').textContent = titulo;
  $('#dialogoCuerpo').innerHTML = html;
  $('#dialogoError').textContent = '';
  alGuardar = guardar;
  $('button[type=submit]', dialogo).hidden = !guardar;
  $('.dialogo-pie [data-cerrar]', dialogo).textContent = guardar ? 'Cancelar' : 'Cerrar';
  dialogo.showModal();
  (guardar ? $('input, textarea, select', dialogo) : $('.dialogo-pie [data-cerrar]', dialogo))?.focus();
}

$$('[data-cerrar]', dialogo).forEach(b => b.addEventListener('click', () => dialogo.close()));
$('#dialogoForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!alGuardar) return dialogo.close();
  const boton = $('button[type=submit]', e.target);
  boton.disabled = true;
  try {
    await alGuardar(new FormData(e.target));
    dialogo.close();
  } catch (err) {
    $('#dialogoError').textContent = err.message;
  } finally {
    boton.disabled = false;
  }
});

/** Pide confirmación y ejecuta fn; los errores se muestran como aviso. */
export async function confirmarYHacer(mensaje, fn) {
  if (!confirm(mensaje)) return;
  try { await fn(); } catch (e) { toast(e.message, 'error'); }
}

/** <option> a partir de un objeto {valor: texto}. */
export const opciones = (lista, actual) => Object.entries(lista).map(([v, t]) =>
  `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(t)}</option>`).join('');
export const opcionesArr = (arr, actual) => opciones(Object.fromEntries(arr.map(x => [x, x])), actual);

/** Fecha corta en formato colombiano. Las fechas de SQLite vienen en UTC sin zona. */
export const fecha = f => f ? new Date(f.includes('T') ? f : f.replace(' ', 'T') + 'Z').toLocaleDateString('es-CO') : '';

/** Muestra un código de recuperación de contraseña recién creado. */
export function mostrarCodigoRecuperacion(r) {
  const vence = new Date(r.expira).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  abrirDialogo('Código de recuperación', `
    <p>Entrégale este código a <b>${esc(r.nombre)}</b> (${esc(r.correo)}) en persona o por WhatsApp:</p>
    <p class="codigo-grande">${esc(r.codigo)}</p>
    <ol class="pasos-texto">
      <li>En la página de ingreso, toca <b>¿Olvidaste tu contraseña?</b></li>
      <li>Escribe su correo, este código y una contraseña nueva.</li>
    </ol>
    <p class="ayuda">Vence el ${esc(vence)} y sirve una sola vez. Si generas otro, este deja de servir.
      Por seguridad no se vuelve a mostrar: cópialo ahora.</p>`);
}
