/**
 * Panel de administración: resumen, reportes del mapa, cursos y lecciones,
 * oportunidades y usuarios. El backend vuelve a verificar que el usuario sea admin.
 */
import { api } from './api.js';
import { $, $$, ico, esc, vacio, toast, iniciarPagina } from './comun.js';

const usuario = await iniciarPagina();

const TIPOS_PUNTO = { wifi: 'Wi-Fi gratuito', comunitario: 'Acceso comunitario', zona: 'Zona con dificultad' };
const TIPOS_OP = ['Beca', 'Curso', 'Empleo', 'Convocatoria', 'Emprendimiento'];
const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Todos'];
const ICONOS = { monitor: 'Computador', documento: 'Documento', tabla: 'Tabla', correo: 'Correo', escudo: 'Seguridad',
                 libro: 'Libro', wifi: 'Wi-Fi', bombillo: 'Idea', maletin: 'Trabajo', grafica: 'Gráfica' };
const COLORES = { '': 'Verde', rio: 'Azul', oro: 'Amarillo', tierra: 'Café' };
const fecha = f => f ? new Date(f.replace(' ', 'T') + 'Z').toLocaleDateString('es-CO') : '';
const opciones = (lista, actual) => Object.entries(lista).map(([v, t]) =>
  `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(t)}</option>`).join('');
const opcionesArr = (arr, actual) => opciones(Object.fromEntries(arr.map(x => [x, x])), actual);

/* =================== Diálogo genérico =================== */
const dialogo = $('#dialogo');
let alGuardar = null;

function abrirDialogo(titulo, html, guardar) {
  $('#dialogoTitulo').textContent = titulo;
  $('#dialogoCuerpo').innerHTML = html;
  $('#dialogoError').textContent = '';
  alGuardar = guardar;
  dialogo.showModal();
  $('input, textarea, select', dialogo)?.focus();
}
$$('[data-cerrar]', dialogo).forEach(b => b.addEventListener('click', () => dialogo.close()));
$('#dialogoForm').addEventListener('submit', async e => {
  e.preventDefault();
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

async function confirmarYHacer(mensaje, fn) {
  if (!confirm(mensaje)) return;
  try { await fn(); } catch (e) { toast(e.message, 'error'); }
}

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
let cursos = [];

CARGAR.cursos = async () => {
  cursos = await api('/admin/cursos');
  $('#listaCursosAdmin').innerHTML = cursos.map(c => `
    <div class="card curso-admin">
      <div class="cab">
        <div class="ico-caja ${c.color}">${ico(c.icono)}</div>
        <h3>${esc(c.titulo)} <small class="etiqueta">${esc(c.nivel)}</small></h3>
        <div class="acciones">
          <button class="btn btn-mini" data-nueva-leccion="${c.id}">+ Lección</button>
          <button class="btn sec btn-mini" data-editar-curso="${c.id}">Editar</button>
          <button class="btn peligro btn-mini" data-borrar-curso="${c.id}" aria-label="Eliminar curso ${esc(c.titulo)}">${ico('papelera')}</button>
        </div>
      </div>
      <ol class="lecciones-admin">
        ${c.lecciones.map((l, i) => `
          <li>
            <span class="num">${i + 1}</span>
            <span class="tit">${esc(l.titulo)}</span>
            <button class="btn-icono" data-editar-leccion="${l.id}" data-curso="${c.id}" aria-label="Editar lección">${ico('documento')}</button>
            <button class="btn-icono" data-borrar-leccion="${l.id}" aria-label="Eliminar lección">${ico('papelera')}</button>
          </li>`).join('') || '<li><span class="tit"><i>Este curso aún no tiene lecciones.</i></span></li>'}
      </ol>
    </div>`).join('') || vacio('libro', 'No hay cursos todavía.');
};

function formCurso(c = {}) {
  return `
    <div class="campo"><label class="t">Título del curso</label><input type="text" name="titulo" value="${esc(c.titulo ?? '')}" maxlength="80" required></div>
    <div class="fila-2">
      <div class="campo"><label class="t">Nivel</label><select name="nivel">${opcionesArr(NIVELES, c.nivel ?? 'Principiante')}</select></div>
      <div class="campo"><label class="t">Ícono</label><select name="icono">${opciones(ICONOS, c.icono ?? 'libro')}</select></div>
    </div>
    <div class="fila-2">
      <div class="campo"><label class="t">Dirigido a</label><input type="text" name="publico" value="${esc(c.publico ?? '')}" maxlength="120" placeholder="Ej: Jóvenes y adultos"></div>
      <div class="campo"><label class="t">Color</label><select name="color">${opciones(COLORES, c.color ?? '')}</select></div>
    </div>`;
}

function formLeccion(l = {}) {
  const ops = [...(l.opciones ?? []), '', '', '', '', ''].slice(0, 5);
  return `
    <div class="campo"><label class="t">Título de la lección</label><input type="text" name="titulo" value="${esc(l.titulo ?? '')}" maxlength="120" required></div>
    <div class="campo"><label class="t">Contenido</label>
      <textarea name="texto" maxlength="5000" required>${esc(l.texto ?? '')}</textarea>
      <p class="ayuda">Deja una línea en blanco entre párrafos · Empieza con <b>-</b> para viñetas o <b>1.</b> para pasos numerados · Usa <b>**texto**</b> para negrita.</p></div>
    <div class="campo"><label class="t">Pregunta de comprobación</label><input type="text" name="pregunta" value="${esc(l.pregunta ?? '')}" maxlength="300" required></div>
    <div class="campo"><label class="t">Opciones (marca la correcta)</label>
      ${ops.map((o, i) => `
        <div class="opcion-fila">
          <input type="radio" name="respuesta" value="${i}" ${l.respuesta === i ? 'checked' : ''} aria-label="Opción ${i + 1} es la correcta">
          <input type="text" name="opcion" value="${esc(o)}" maxlength="150" placeholder="Opción ${i + 1}${i < 2 ? '' : ' (opcional)'}">
        </div>`).join('')}
    </div>`;
}

/** Convierte el formulario de lección en datos; la respuesta se ajusta si hay opciones vacías antes. */
function datosLeccion(f) {
  const todas = f.getAll('opcion');
  const marcada = f.get('respuesta');
  const opciones = [];
  let respuesta = -1;
  todas.forEach((o, i) => {
    if (!o.trim()) return;
    if (String(i) === marcada) respuesta = opciones.length;
    opciones.push(o.trim());
  });
  if (marcada !== null && respuesta === -1) throw new Error('La opción marcada como correcta está vacía.');
  return { titulo: f.get('titulo'), texto: f.get('texto'), pregunta: f.get('pregunta'), opciones, respuesta };
}

$('#btnNuevoCurso').addEventListener('click', () => abrirDialogo('Nuevo curso', formCurso(), async f => {
  await api('/admin/cursos', { metodo: 'POST', datos: Object.fromEntries(f) });
  toast('Curso creado. Ahora agrégale lecciones.');
  CARGAR.cursos();
}));

$('#listaCursosAdmin').addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  const curso = cursos.find(c => c.id === (d.curso ?? d.editarCurso ?? d.nuevaLeccion ?? d.borrarCurso));

  if (d.editarCurso) abrirDialogo('Editar curso', formCurso(curso), async f => {
    await api(`/admin/cursos/${encodeURIComponent(curso.id)}`, { metodo: 'PUT', datos: Object.fromEntries(f) });
    toast('Curso actualizado.');
    CARGAR.cursos();
  });

  if (d.borrarCurso) confirmarYHacer(
    `¿Eliminar el curso "${curso.titulo}" con todas sus lecciones y el avance de los estudiantes? Los certificados ya emitidos seguirán siendo válidos.`,
    async () => {
      await api(`/admin/cursos/${encodeURIComponent(curso.id)}`, { metodo: 'DELETE' });
      toast('Curso eliminado.');
      CARGAR.cursos();
    });

  if (d.nuevaLeccion) abrirDialogo(`Nueva lección · ${curso.titulo}`, formLeccion(), async f => {
    await api(`/admin/cursos/${encodeURIComponent(curso.id)}/lecciones`, { metodo: 'POST', datos: datosLeccion(f) });
    toast('Lección agregada.');
    CARGAR.cursos();
  });

  if (d.editarLeccion) {
    const l = curso.lecciones.find(x => x.id === Number(d.editarLeccion));
    abrirDialogo(`Editar lección · ${curso.titulo}`, formLeccion(l), async f => {
      await api(`/admin/lecciones/${l.id}`, { metodo: 'PUT', datos: datosLeccion(f) });
      toast('Lección actualizada.');
      CARGAR.cursos();
    });
  }

  if (d.borrarLeccion) confirmarYHacer('¿Eliminar esta lección? También se borrará el avance de quienes la completaron.', async () => {
    await api(`/admin/lecciones/${d.borrarLeccion}`, { metodo: 'DELETE' });
    toast('Lección eliminada.');
    CARGAR.cursos();
  });
});

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
CARGAR.usuarios = async () => {
  const lista = await api('/admin/usuarios');
  $('#tablaUsuarios').innerHTML = `
    <thead><tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Barrio</th><th>Lecciones</th><th>Certificados</th><th>Registro</th><th>Rol</th></tr></thead>
    <tbody>${lista.map(u => `
      <tr>
        <td>${esc(u.nombre)}</td><td>${esc(u.correo)}</td><td>${esc(u.perfil)}</td><td>${esc(u.barrio ?? '')}</td>
        <td>${u.lecciones}</td><td>${u.certificados}</td><td>${fecha(u.creado)}</td>
        <td>${u.id === usuario.id
          ? '<span class="etiqueta">Admin (tú)</span>'
          : `<button class="btn btn-mini ${u.rol === 'admin' ? 'peligro' : 'sec'}" data-rol="${u.rol === 'admin' ? 'usuario' : 'admin'}" data-id="${u.id}">
               ${u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>`}</td>
      </tr>`).join('')}</tbody>`;
};

$('#tablaUsuarios').addEventListener('click', e => {
  const b = e.target.closest('[data-rol]');
  if (!b) return;
  const texto = b.dataset.rol === 'admin'
    ? '¿Dar permisos de administrador a esta persona? Podrá editar todo el contenido y ver los datos.'
    : '¿Quitar los permisos de administrador a esta persona?';
  confirmarYHacer(texto, async () => {
    await api(`/admin/usuarios/${b.dataset.id}/rol`, { metodo: 'PUT', datos: { rol: b.dataset.rol } });
    toast('Rol actualizado.');
    CARGAR.usuarios();
  });
});

/* =================== Inicio =================== */
if (usuario?.rol !== 'admin') {
  $('#contenido').innerHTML += vacio('candado', 'Esta sección es solo para administradores.');
} else {
  $('#panel').hidden = false;
  abrirTab(location.hash.slice(1));
}
