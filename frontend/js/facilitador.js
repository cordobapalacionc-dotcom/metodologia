/**
 * Panel del facilitador: sus cursos de grupo (con código de invitación) y el avance
 * de sus estudiantes. El backend vuelve a comprobar que todo sea del facilitador.
 */
import { api } from './api.js';
import { $, $$, ico, esc, vacio, toast, iniciarPagina } from './comun.js';
import { confirmarYHacer, fecha, mostrarCodigoRecuperacion } from './dialogo.js';
import { montarEditorCursos } from './editor-cursos.js';

const usuario = await iniciarPagina();

const enlaceInvitacion = codigo => `${location.origin}/aula?unirse=${encodeURIComponent(codigo)}`;
const mensajeWhatsApp = c =>
  `Te invito al curso "${c.titulo}" en Quibdó Conecta. Entra a ${enlaceInvitacion(c.codigo_acceso)} ` +
  `o escribe el código ${c.codigo_acceso} en el Aula virtual.`;

/* =================== Pestañas =================== */
const CARGAR = {};
function abrirTab(tab) {
  if (!CARGAR[tab]) tab = 'cursos';
  $$('.tabs-admin button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  $$('[role=tabpanel]').forEach(s => { s.hidden = s.id !== `tab-${tab}`; });
  history.replaceState(null, '', '#' + tab);
  CARGAR[tab]().catch(e => toast(e.message, 'error'));
}
$('.tabs-admin').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) abrirTab(b.dataset.tab);
});

/* =================== Mis cursos =================== */
const editor = montarEditorCursos({
  base: '/facilitador',
  contenedor: $('#listaCursos'),
  botonNuevo: $('#btnNuevoCurso'),
  textoVacio: 'Aún no tienes cursos. Crea el primero para tu grupo.',
  avisoBorrar: ' Tus estudiantes ya no podrán verlo.',
  extra: c => `
    <div class="invitacion">
      <div>
        <small>Código de invitación</small>
        <b class="codigo">${esc(c.codigo_acceso)}</b>
      </div>
      <div class="acciones">
        <button class="btn sec btn-mini" data-copiar="${esc(c.id)}">${ico('externo')} Copiar enlace</button>
        <a class="btn sec btn-mini" href="https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(c))}" target="_blank" rel="noopener">${ico('correo')} Enviar por WhatsApp</a>
        <button class="btn fantasma btn-mini" data-cambiar-codigo="${esc(c.id)}">Cambiar código</button>
        <button class="btn fantasma btn-mini" data-ver-estudiantes="${esc(c.id)}">${ico('usuarios')} ${c.estudiantes} estudiante${c.estudiantes === 1 ? '' : 's'}</button>
      </div>
    </div>`,
});
CARGAR.cursos = editor.cargar;

$('#listaCursos').addEventListener('click', async e => {
  const b = e.target.closest('[data-copiar],[data-cambiar-codigo],[data-ver-estudiantes]');
  if (!b) return;
  const curso = editor.cursos().find(c => c.id === (b.dataset.copiar ?? b.dataset.cambiarCodigo ?? b.dataset.verEstudiantes));

  if (b.dataset.copiar) {
    const url = enlaceInvitacion(curso.codigo_acceso);
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado. Compártelo con tu grupo.'); }
    catch { toast(url); }
  }
  if (b.dataset.cambiarCodigo) confirmarYHacer(
    'Se creará un código nuevo y el anterior dejará de servir. Quienes ya están en el curso no se ven afectados. ¿Continuar?',
    async () => {
      const r = await api(`/facilitador/cursos/${encodeURIComponent(curso.id)}/codigo`, { metodo: 'POST' });
      toast(`Nuevo código: ${r.codigo_acceso}`);
      editor.cargar();
    });
  if (b.dataset.verEstudiantes) {
    cursoElegido = curso.id;
    abrirTab('estudiantes');
  }
});

/* =================== Estudiantes =================== */
let cursoElegido = null;
let estudiantes = [];

CARGAR.estudiantes = async () => {
  const cursos = editor.cursos().length ? editor.cursos() : (await editor.cargar(), editor.cursos());
  const sel = $('#cursoEstudiantes');
  if (!cursos.length) {
    sel.closest('.campo').hidden = true;
    $('#resumenEstudiantes').innerHTML = vacio('libro', 'Primero crea un curso en “Mis cursos”.');
    $('#tablaEstudiantes').innerHTML = '';
    return;
  }
  sel.closest('.campo').hidden = false;
  if (!cursos.some(c => c.id === cursoElegido)) cursoElegido = cursos[0].id;
  sel.innerHTML = cursos.map(c => `<option value="${esc(c.id)}" ${c.id === cursoElegido ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('');
  await pintarEstudiantes();
};

$('#cursoEstudiantes').addEventListener('change', e => {
  cursoElegido = e.target.value;
  pintarEstudiantes().catch(err => toast(err.message, 'error'));
});

async function pintarEstudiantes() {
  const curso = editor.cursos().find(c => c.id === cursoElegido);
  const { total, estudiantes: lista } = await api(`/facilitador/cursos/${encodeURIComponent(cursoElegido)}/estudiantes`);
  estudiantes = lista;
  const terminaron = lista.filter(x => total && x.completadas >= total).length;
  $('#resumenEstudiantes').innerHTML = lista.length ? `
    <div class="cifras-mini resumen-grupo">
      <div><b>${lista.length}</b><span>estudiantes</span></div>
      <div><b>${terminaron}</b><span>terminaron</span></div>
      <div><b>${total}</b><span>lecciones en el curso</span></div>
    </div>` : `
    <div class="card vacio">${ico('usuarios')}
      <p>Todavía nadie se ha unido. Comparte el código <b class="codigo">${esc(curso.codigo_acceso)}</b> con tu grupo.</p></div>`;

  $('#tablaEstudiantes').innerHTML = lista.length ? `
    <thead><tr><th>Nombre</th><th>Correo</th><th>Barrio</th><th>Avance</th><th>Última actividad</th><th>Certificado</th><th></th></tr></thead>
    <tbody>${lista.map(x => {
      const p = total ? Math.round(x.completadas / total * 100) : 0;
      return `
      <tr>
        <td>${esc(x.nombre)}</td>
        <td>${esc(x.correo)}</td>
        <td>${esc(x.barrio ?? '')}</td>
        <td><div class="avance"><div class="barra"><span style="width:${p}%"></span></div><small>${x.completadas}/${total}</small></div></td>
        <td>${x.ultima ? fecha(x.ultima) : '<small>Sin empezar</small>'}</td>
        <td>${x.certificado ? `<a href="/certificado?codigo=${encodeURIComponent(x.certificado)}" target="_blank">${esc(x.certificado)}</a>` : ''}</td>
        <td><div class="acciones">
          ${x.rol === 'usuario' ? `<button class="btn sec btn-mini" data-recuperar="${x.id}" title="Código para crear una contraseña nueva">${ico('candado')} Código</button>` : ''}
          <button class="btn peligro btn-mini" data-quitar="${x.id}" aria-label="Quitar a ${esc(x.nombre)} del curso">${ico('papelera')}</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody>` : '';
}

$('#tablaEstudiantes').addEventListener('click', e => {
  const rec = e.target.closest('[data-recuperar]');
  const quitar = e.target.closest('[data-quitar]');
  if (rec) {
    const x = estudiantes.find(s => s.id === Number(rec.dataset.recuperar));
    confirmarYHacer(`¿Generar un código para que ${x.nombre} cree una contraseña nueva? Hazlo solo si la persona te lo pidió.`, async () => {
      mostrarCodigoRecuperacion(await api(`/facilitador/estudiantes/${x.id}/recuperacion`, { metodo: 'POST' }));
    });
  }
  if (quitar) {
    const x = estudiantes.find(s => s.id === Number(quitar.dataset.quitar));
    confirmarYHacer(`¿Quitar a ${x.nombre} de este curso? Ya no podrá verlo. Su avance y certificado se conservan.`, async () => {
      await api(`/facilitador/cursos/${encodeURIComponent(cursoElegido)}/estudiantes/${x.id}`, { metodo: 'DELETE' });
      toast('Estudiante retirado del curso.');
      pintarEstudiantes();
      editor.cargar();
    });
  }
});

/* =================== Inicio =================== */
if (!['facilitador', 'admin'].includes(usuario?.rol)) {
  $('#contenido').innerHTML += vacio('candado',
    'Esta sección es para facilitadores. Si eres docente o líder comunitario, pide al administrador que active tu cuenta como facilitador.');
} else {
  $('#panel').hidden = false;
  abrirTab(location.hash.slice(1));
}
