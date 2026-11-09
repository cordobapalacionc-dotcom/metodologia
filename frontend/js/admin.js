/**
 * Panel de administración: resumen, impacto, reportes del mapa, cursos y lecciones,
 * oportunidades, usuarios y copias de seguridad. El backend vuelve a verificar que el usuario sea admin.
 */
import { api } from './api.js';
import { $, $$, ico, esc, vacio, toast, iniciarPagina } from './comun.js';
import { abrirDialogo, confirmarYHacer, opciones, opcionesArr, fecha, mostrarCodigoRecuperacion } from './dialogo.js';
import { montarEditorCursos } from './editor-cursos.js';
import { pintarImpacto } from './impacto.js';

const usuario = await iniciarPagina();

const TIPOS_PUNTO = { wifi: 'Wi-Fi gratuito', comunitario: 'Acceso comunitario', zona: 'Zona con dificultad' };
const TIPOS_OP = ['Beca', 'Curso', 'Empleo', 'Convocatoria', 'Emprendimiento'];
const ROLES = { usuario: 'Usuario', facilitador: 'Facilitador', admin: 'Administrador' };

/* =================== Pestañas =================== */
const CARGAR = {};
function abrirTab(tab) {
  if (!CARGAR[tab]) tab = 'resumen';
  $$('.tabs-admin button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  $$('[role=tabpanel]').forEach(s => { s.hidden = s.id !== `tab-${tab}`; });
  history.replaceState(null, '', '#' + tab);
  CARGAR[tab]().catch(e => toast(e.message, 'error'));
}
$('.tabs-admin').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) abrirTab(b.dataset.tab);
});

/* =================== Resumen =================== */
CARGAR.resumen = async () => {
  const s = await api('/admin/resumen');
  pintarContador(s.reportesPendientes);
  $('#tab-resumen').innerHTML = `
    <div class="stats-admin">
      <div class="card"><b>${s.usuarios}</b><span>personas registradas</span></div>
      <div class="card"><b>${s.diagnosticos}</b><span>diagnósticos (${s.diagnosticosSemana} esta semana)</span></div>
      <div class="card"><b>${s.leccionesCompletadas}</b><span>lecciones completadas</span></div>
      <div class="card"><b>${s.certificados}</b><span>certificados emitidos</span></div>
      <div class="card ${s.reportesPendientes ? 'alerta' : ''}"><b>${s.reportesPendientes}</b><span>reportes del mapa por verificar</span></div>
      <div class="card"><b>${s.cursos}</b><span>cursos · ${s.oportunidades} oportunidades</span></div>
    </div>
    <div class="acciones">
      ${s.reportesPendientes ? `<button class="btn" data-ir="reportes">${ico('pin')} Revisar reportes pendientes</button>` : ''}
      <a class="btn sec" href="/api/diagnosticos/exportar">${ico('descargar')} Exportar diagnósticos (CSV)</a>
      <a class="btn fantasma" href="/diagnostico">${ico('grafica')} Ver estadísticas de la comunidad</a>
    </div>`;
};
$('#tab-resumen').addEventListener('click', e => {
  const b = e.target.closest('[data-ir]');
  if (b) abrirTab(b.dataset.ir);
});

function pintarContador(n) {
  $('#contReportes').hidden = !n;
  $('#contReportes').textContent = n;
}

/* =================== Reportes del mapa =================== */
let puntos = [];
let filtroReportes = 'pendientes';

CARGAR.reportes = async () => {
  puntos = await api('/admin/puntos');
  pintarContador(puntos.filter(p => !p.verificado).length);
  pintarReportes();
};

function pintarReportes() {
  const lista = puntos.filter(p => filtroReportes === 'todos' || !p.verificado);
  $('#listaReportes').innerHTML = lista.map(p => `
    <div class="fila-admin ${p.verificado ? '' : 'pendiente'}">
      <div class="info">
        <span class="etiqueta ${p.verificado ? '' : 'oro'}">${p.verificado ? 'Verificado' : 'Por verificar'}</span>
        <span class="etiqueta rio">${TIPOS_PUNTO[p.tipo]}</span>
        <b>${esc(p.nombre)}</b>
        <small>${p.autor ? `Reportado por ${esc(p.autor)} (${esc(p.autor_correo)}) · ` : ''}${fecha(p.creado)}</small>
        <small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} ·
          <a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}" target="_blank" rel="noopener">Ver ubicación ${ico('externo')}</a></small>
      </div>
      <div class="acciones">
        ${p.verificado ? '' : `<button class="btn btn-mini" data-aprobar="${p.id}">${ico('check')} Aprobar</button>`}
        <button class="btn sec btn-mini" data-editar="${p.id}">Editar</button>
        <button class="btn peligro btn-mini" data-borrar="${p.id}" aria-label="Eliminar ${esc(p.nombre)}">${ico('papelera')}</button>
      </div>
    </div>`).join('') || vacio('check', filtroReportes === 'pendientes' ? 'No hay reportes pendientes. ¡Todo al día!' : 'No hay puntos.');
}

$('#filtroReportes').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('#filtroReportes button').forEach(x => x.setAttribute('aria-pressed', x === b));
  filtroReportes = b.dataset.f;
  pintarReportes();
});

$('#listaReportes').addEventListener('click', e => {
  const aprobar = e.target.closest('[data-aprobar]');
  const editar = e.target.closest('[data-editar]');
  const borrar = e.target.closest('[data-borrar]');
  if (aprobar) {
    api(`/admin/puntos/${aprobar.dataset.aprobar}/verificar`, { metodo: 'POST' })
      .then(() => { toast('Punto aprobado: ya aparece como verificado.'); CARGAR.reportes(); })
      .catch(err => toast(err.message, 'error'));
  }
  if (borrar) {
    confirmarYHacer('¿Eliminar este punto del mapa?', async () => {
      await api(`/admin/puntos/${borrar.dataset.borrar}`, { metodo: 'DELETE' });
      toast('Punto eliminado.');
      CARGAR.reportes();
    });
  }
  if (editar) editarPunto(puntos.find(p => p.id === Number(editar.dataset.editar)));
});

function editarPunto(p) {
  abrirDialogo('Editar punto del mapa', `
    <div class="campo"><label class="t">Nombre</label><input type="text" name="nombre" value="${esc(p.nombre)}" maxlength="80" required></div>
    <div class="fila-2">
      <div class="campo"><label class="t">Tipo</label><select name="tipo">${opciones(TIPOS_PUNTO, p.tipo)}</select></div>
      <div class="campo"><label class="t">Radio en metros (zonas)</label><input type="text" inputmode="numeric" name="radio" value="${p.radio ?? ''}"></div>
    </div>
    <div class="fila-2">
      <div class="campo"><label class="t">Latitud</label><input type="text" inputmode="decimal" name="lat" value="${p.lat}" required></div>
      <div class="campo"><label class="t">Longitud</label><input type="text" inputmode="decimal" name="lng" value="${p.lng}" required></div>
    </div>
    <div class="fila-2">
      <div class="campo"><label class="t">Horario</label><input type="text" name="horario" value="${esc(p.horario ?? '')}" maxlength="80"></div>
      <div class="campo"><label class="t">Calidad de señal</label><input type="text" name="senal" value="${esc(p.senal ?? '')}" maxlength="40"></div>
    </div>
    <div class="campo"><label class="t">Descripción</label><input type="text" name="descripcion" value="${esc(p.descripcion ?? '')}" maxlength="300"></div>
    <p class="ayuda">Al guardar, el punto queda como verificado.</p>`,
  async f => {
    await api(`/admin/puntos/${p.id}`, { metodo: 'PUT', datos: Object.fromEntries(f) });
    toast('Punto actualizado y verificado.');
    CARGAR.reportes();
  });
}

/* =================== Cursos y lecciones =================== */
const editor = montarEditorCursos({
  base: '/admin',
  contenedor: $('#listaCursosAdmin'),
  botonNuevo: $('#btnNuevoCurso'),
  extra: c => c.codigo_acceso ? `
    <p class="info-grupo">${ico('usuarios')} Curso de grupo de <b>${esc(c.autor ?? 'un facilitador')}</b> ·
      ${c.estudiantes} estudiante${c.estudiantes === 1 ? '' : 's'} · código <code>${esc(c.codigo_acceso)}</code></p>` : '',
});
CARGAR.cursos = editor.cargar;

/* =================== Oportunidades =================== */
let ops = [];

CARGAR.oportunidades = async () => {
  ops = await api('/oportunidades');
  $('#listaOpAdmin').innerHTML = ops.map(o => `
    <div class="fila-admin">
      <div class="info">
        <span class="etiqueta">${esc(o.tipo)}</span>
        <b>${esc(o.titulo)}</b>
        <small>${esc(o.entidad)} · <a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.url)}</a></small>
      </div>
      <div class="acciones">
        <button class="btn sec btn-mini" data-editar="${o.id}">Editar</button>
        <button class="btn peligro btn-mini" data-borrar="${o.id}" aria-label="Eliminar ${esc(o.titulo)}">${ico('papelera')}</button>
      </div>
    </div>`).join('') || vacio('birrete', 'No hay oportunidades publicadas.');
};

function formOportunidad(o = {}) {
  return `
    <div class="campo"><label class="t">Título</label><input type="text" name="titulo" value="${esc(o.titulo ?? '')}" maxlength="120" required></div>
    <div class="fila-2">
      <div class="campo"><label class="t">Tipo</label><select name="tipo">${opcionesArr(TIPOS_OP, o.tipo ?? 'Beca')}</select></div>
      <div class="campo"><label class="t">Entidad</label><input type="text" name="entidad" value="${esc(o.entidad ?? '')}" maxlength="80" required></div>
    </div>
    <div class="campo"><label class="t">Descripción</label><textarea name="descripcion" maxlength="400" style="min-height:90px">${esc(o.descripcion ?? '')}</textarea></div>
    <div class="campo"><label class="t">Enlace oficial</label><input type="text" inputmode="url" name="url" value="${esc(o.url ?? 'https://')}" maxlength="300" required>
      <p class="ayuda">Usa siempre la página oficial de la entidad.</p></div>`;
}

$('#btnNuevaOp').addEventListener('click', () => abrirDialogo('Nueva oportunidad', formOportunidad(), async f => {
  await api('/admin/oportunidades', { metodo: 'POST', datos: Object.fromEntries(f) });
  toast('Oportunidad publicada.');
  CARGAR.oportunidades();
}));

$('#listaOpAdmin').addEventListener('click', e => {
  const editar = e.target.closest('[data-editar]');
  const borrar = e.target.closest('[data-borrar]');
  if (editar) {
    const o = ops.find(x => x.id === Number(editar.dataset.editar));
    abrirDialogo('Editar oportunidad', formOportunidad(o), async f => {
      await api(`/admin/oportunidades/${o.id}`, { metodo: 'PUT', datos: Object.fromEntries(f) });
      toast('Oportunidad actualizada.');
      CARGAR.oportunidades();
    });
  }
  if (borrar) confirmarYHacer('¿Eliminar esta oportunidad?', async () => {
    await api(`/admin/oportunidades/${borrar.dataset.borrar}`, { metodo: 'DELETE' });
    toast('Oportunidad eliminada.');
    CARGAR.oportunidades();
  });
});

/* =================== Usuarios =================== */
let usuarios = [];

CARGAR.usuarios = async () => {
  usuarios = await api('/admin/usuarios');
  $('#tablaUsuarios').innerHTML = `
    <thead><tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Barrio</th><th>Lecciones</th><th>Certificados</th><th>Registro</th><th>Rol y contraseña</th></tr></thead>
    <tbody>${usuarios.map(u => `
      <tr>
        <td>${esc(u.nombre)}</td><td>${esc(u.correo)}</td><td>${esc(u.perfil)}</td><td>${esc(u.barrio ?? '')}</td>
        <td>${u.lecciones}</td><td>${u.certificados}</td><td>${fecha(u.creado)}</td>
        <td>${u.id === usuario.id
          ? '<span class="etiqueta">Admin (tú)</span>'
          : `<div class="celda-rol">
              <select class="select-mini" data-rol-id="${u.id}" aria-label="Rol de ${esc(u.nombre)}">${opciones(ROLES, u.rol)}</select>
              <button class="btn sec btn-mini" data-recuperar="${u.id}" title="Generar código para que cree una contraseña nueva"
                aria-label="Código de recuperación para ${esc(u.nombre)}">${ico('candado')}</button>
            </div>`}</td>
      </tr>`).join('')}</tbody>`;
};

const AVISO_ROL = {
  admin: 'podrá editar todo el contenido, ver los datos de todas las personas y descargar copias de la base de datos',
  facilitador: 'podrá crear cursos para sus grupos, ver el avance de sus estudiantes y darles códigos para recuperar la contraseña',
  usuario: 'perderá los permisos especiales (sus cursos de grupo se conservan)',
};

$('#tablaUsuarios').addEventListener('change', e => {
  const sel = e.target.closest('[data-rol-id]');
  if (!sel) return;
  const u = usuarios.find(x => x.id === Number(sel.dataset.rolId));
  if (!confirm(`¿Cambiar el rol de ${u.nombre} a "${ROLES[sel.value]}"? ${AVISO_ROL[sel.value]}.`)) {
    sel.value = u.rol;
    return;
  }
  api(`/admin/usuarios/${u.id}/rol`, { metodo: 'PUT', datos: { rol: sel.value } })
    .then(() => { u.rol = sel.value; toast('Rol actualizado.'); })
    .catch(err => { sel.value = u.rol; toast(err.message, 'error'); });
});

$('#tablaUsuarios').addEventListener('click', e => {
  const b = e.target.closest('[data-recuperar]');
  if (!b) return;
  const u = usuarios.find(x => x.id === Number(b.dataset.recuperar));
  confirmarYHacer(`¿Generar un código para que ${u.nombre} cree una contraseña nueva? Usa esta opción solo si la persona te lo pidió.`, async () => {
    mostrarCodigoRecuperacion(await api(`/admin/usuarios/${u.id}/recuperacion`, { metodo: 'POST' }));
  });
});

/* =================== Impacto =================== */
CARGAR.impacto = async () => {
  $('#impacto').innerHTML = '<div class="esqueleto" style="min-height:300px"></div>';
  pintarImpacto($('#impacto'), await api('/admin/impacto'));
};
$('#btnImprimirImpacto').addEventListener('click', () => window.print());

/* =================== Copias de seguridad =================== */
const tamano = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

CARGAR.copias = async () => {
  const copias = await api('/admin/copias');
  $('#tablaCopias').innerHTML = copias.length ? `
    <thead><tr><th>Archivo</th><th>Fecha</th><th>Tamaño</th><th>Tipo</th><th></th></tr></thead>
    <tbody>${copias.map(c => `
      <tr>
        <td><code>${esc(c.nombre)}</code></td>
        <td>${new Date(c.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        <td>${tamano(c.bytes)}</td>
        <td><span class="etiqueta ${c.manual ? 'oro' : ''}">${c.manual ? 'Manual' : 'Automática'}</span></td>
        <td><a class="btn sec btn-mini" href="/api/admin/copias/${encodeURIComponent(c.nombre)}" download>${ico('descargar')} Descargar</a></td>
      </tr>`).join('')}</tbody>` : `<tbody><tr><td>${vacio('carpeta', 'Todavía no hay copias.')}</td></tr></tbody>`;
};

$('#btnCopia').addEventListener('click', async e => {
  const b = e.currentTarget;
  b.disabled = true;
  try {
    const c = await api('/admin/copias', { metodo: 'POST' });
    toast(`Copia creada: ${c.nombre}`);
    CARGAR.copias();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    b.disabled = false;
  }
});

/* =================== Inicio =================== */
if (usuario?.rol !== 'admin') {
  $('#contenido').innerHTML += vacio('candado', 'Esta sección es solo para administradores.');
} else {
  $('#panel').hidden = false;
  abrirTab(location.hash.slice(1));
}
