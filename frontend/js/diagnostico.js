/**
 * Diagnóstico digital: formulario, resultado personal, panel de la comunidad,
 * guardado sin conexión y "modo jornada" para registrar a otras personas.
 */
import { api } from './api.js';
import { $, ico, esc, toast, iniciarPagina } from './comun.js';
import { analizar } from './analisis.js';
import { encolar, pendientes, sincronizar } from './cola.js';

const usuario = await iniciarPagina();
const NIVELES = ['', 'Ninguno', 'Básico', 'Intermedio', 'Avanzado'];
const form = $('#formDiag');

$('#nivelRange').addEventListener('input', e => {
  $('#nivelTxt').textContent = `${e.target.value} – ${NIVELES[e.target.value]}`;
});
if (usuario?.barrio) $('#diagBarrio').value = usuario.barrio;
if (!usuario) $('#avisoInvitado').hidden = false;
if (usuario) $('#modoJornada').hidden = false;
if (usuario?.rol === 'admin') $('#exportar').hidden = false;

/* ---------- Resultado ---------- */
function pintarResultado(r, { local = false, otraPersona = false } = {}) {
  const titulo = otraPersona ? 'Resultado de la persona registrada' : 'Tu resultado';
  $('#resultadoDiag').innerHTML = `
    <div class="card resultado ${local ? 'local' : ''}">
      ${local ? `<p class="aviso info" style="margin-top:0">${ico('wifi-off')}<span>Guardado en este dispositivo. Se enviará solo cuando vuelva la conexión.</span></p>` : ''}
      <small style="color:var(--suave)">${titulo}</small>
      <h3>${ico('grafica')} ${esc(r.perfil)}</h3>
      <p style="margin-bottom:2px">${ico('wifi')} Acceso a tecnología: <b>${r.acceso}/100</b></p>
      <div class="barra"><span style="width:${r.acceso}%"></span></div>
      <p style="margin-bottom:2px">${ico('monitor')} Habilidades digitales: <b>${r.habilidades}/100</b></p>
      <div class="barra"><span style="width:${r.habilidades}%;background:var(--rio)"></span></div>
      <p><b>Ruta de aprendizaje recomendada:</b></p>
      <ol>${r.ruta.map(c => `<li><a href="/aula?curso=${encodeURIComponent(c.id)}">${ico(c.icono)} ${esc(c.titulo)}</a></li>`).join('')}</ol>
      <p><b>${ico('bombillo')} Recomendaciones:</b></p>
      <ul>${r.consejos.map(c => `<li>${esc(c.texto)}${c.pagina ? ` <a href="${c.pagina}">Ir ${ico('der')}</a>` : ''}</li>`).join('')}</ul>
    </div>`;
}

/* ---------- Panel de la comunidad ---------- */
const barras = (titulo, items) => !items?.length ? '' :
  `<p style="margin:12px 0 4px"><b>${titulo}</b></p>` + items.map(i => `
    <div class="fila-barra"><span>${esc(i.nombre)}</span>
      <div class="barra"><span style="width:${i.porcentaje}%"></span></div><span>${i.porcentaje}%</span></div>`).join('');

async function pintarPanel() {
  try {
    const s = await api('/diagnosticos/estadisticas');
    $('#panelDiag').innerHTML = !s.total ? '<p><i>Todavía no hay diagnósticos registrados.</i></p>' : `
      <div class="stats">
        <div class="stat"><b>${s.total}</b><span>diagnósticos</span></div>
        <div class="stat"><b>${s.sinInternet}%</b><span>sin Internet</span></div>
        <div class="stat"><b>${s.sinComputador}%</b><span>sin computador</span></div>
        <div class="stat"><b>${s.nivelPromedio}/4</b><span>nivel promedio</span></div>
      </div>
      ${barras('Principales dificultades', s.dificultades)}
      ${barras('Tipo de conexión', s.conexion)}
      ${barras('Barrios con más respuestas', s.barrios)}`;
  } catch (e) {
    $('#panelDiag').innerHTML = `<p>${esc(e.message)}</p>`;
  }
}

/* ---------- Pendientes sin conexión ---------- */
function pintarPendientes() {
  const n = pendientes().length;
  $('#avisoPendientes').hidden = !n;
  $('#textoPendientes').innerHTML = n === 1
    ? '<b>1 diagnóstico</b> guardado en este dispositivo, esperando conexión para enviarse.'
    : `<b>${n} diagnósticos</b> guardados en este dispositivo, esperando conexión para enviarse.`;
}

$('#btnSincronizar').addEventListener('click', async () => {
  if (!navigator.onLine) { toast('Todavía no hay conexión. Se enviarán solos cuando vuelva.', 'error'); return; }
  const n = await sincronizar(usuario);
  if (n) toast(n === 1 ? 'Se envió 1 diagnóstico.' : `Se enviaron ${n} diagnósticos.`);
  else toast('No se pudo enviar. Inténtalo de nuevo en un momento.', 'error');
});

// El aviso "Se enviaron N diagnósticos" lo muestra comun.js; aquí solo se actualiza la pantalla
addEventListener('qc:sincronizado', () => {
  pintarPendientes();
  pintarPanel();
});

/* ---------- Enviar formulario ---------- */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(form);
  const otraPersona = $('#chkJornada').checked;
  const datos = {
    edad: f.get('edad'), internet: f.get('internet'), calidad: f.get('calidad'), frecuencia: f.get('frecuencia'),
    nivel: Number(f.get('nivel')), dispositivos: f.getAll('dispositivos'), dificultades: f.getAll('dificultades'),
    barrio: f.get('barrio'), paraOtraPersona: otraPersona,
  };
  if (!datos.dispositivos.length) { toast('Marca al menos una opción de dispositivo (o "Ninguno").', 'error'); return; }

  const boton = $('button[type=submit]', form);
  boton.disabled = true;
  try {
    const r = await api('/diagnosticos', { metodo: 'POST', datos });
    pintarResultado(r.resultado, { otraPersona });
    toast(otraPersona ? 'Diagnóstico registrado. Puedes registrar a la siguiente persona.' : '¡Listo! Este es tu resultado.');
    pintarPanel();
    terminar(otraPersona);
  } catch (err) {
    if (err.estado === 0 || err.estado === 503) {
      // Sin conexión: guardar en el dispositivo y mostrar el resultado calculado aquí mismo
      encolar(datos, usuario);
      pintarResultado(analizar(datos), { local: true, otraPersona });
      pintarPendientes();
      toast('Sin conexión: el diagnóstico quedó guardado y se enviará después.');
      terminar(otraPersona);
    } else {
      toast(err.message, 'error');
    }
  } finally {
    boton.disabled = false;
  }
});

/** En modo jornada se limpia el formulario para la siguiente persona. */
function terminar(otraPersona) {
  $('#resultadoDiag').scrollIntoView({ behavior: 'smooth' });
  if (!otraPersona) return;
  const barrio = $('#diagBarrio').value; // en una jornada suele ser el mismo barrio
  form.reset();
  $('#chkJornada').checked = true;
  $('#diagBarrio').value = barrio;
  $('#nivelTxt').textContent = '2 – Básico';
}

/* ---------- Carga inicial ---------- */
pintarPendientes();
pintarPanel();
if (usuario) {
  api('/diagnosticos/mio').then(r => { if (r.diagnostico) pintarResultado(r.resultado); }).catch(() => {});
}
