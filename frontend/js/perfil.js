/**
 * Mi panel: todo lo que ha hecho el usuario, editar datos y cambiar contraseña.
 */
import { api } from './api.js';
import { $, $$, ico, esc, toast, iniciarPagina, iniciales, recordarUsuario } from './comun.js';

const usuario = await iniciarPagina();

const PERFILES = ['Estudiante', 'Adulto', 'Docente', 'Emprendedor', 'Adulto mayor'];
const TIPO_PUNTO = { wifi: 'Wi-Fi gratuito', comunitario: 'Acceso comunitario', zona: 'Zona con dificultad' };
const aFecha = f => new Date(f.replace(' ', 'T') + 'Z');
const fecha = f => aFecha(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

/** "hace 3 días", "hoy"… */
function hace(f) {
  const dias = Math.floor((Date.now() - aFecha(f)) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return fecha(f);
}
const vacioMini = txt => `<p class="vacio-mini">${esc(txt)}</p>`;

/* =================== Invitado =================== */
if (!usuario) {
  $('#cargando').outerHTML = `
    <div class="card vacio" style="max-width:520px;margin:30px auto">
      ${ico('usuario')}
      <h3 style="justify-content:center">Tu panel personal</h3>
      <p>Crea una cuenta gratis para ver aquí tu avance en los cursos, tus certificados, tu evolución digital y todo lo que has hecho.</p>
      <a class="btn" href="/?registro">${ico('usuario-mas')} Crear cuenta</a>
    </div>`;
} else {
  cargar();
}

/* =================== Cargar y pintar =================== */
let datos = null;

async function cargar() {
  try {
    datos = await api('/perfil');
    pintar();
    $('#cargando').hidden = true;
    $('#panelPerfil').hidden = false;
  } catch (e) {
    $('#cargando').outerHTML = `<div class="card vacio">${ico('wifi-off')}<p>${esc(e.message)}</p></div>`;
  }
}

function pintar() {
  const { usuario: u, resumen: r } = datos;
  $('#avatarGrande').textContent = iniciales(u.nombre);
  $('#nombre').textContent = u.nombre;
  $('#subtitulo').innerHTML = [
    esc(u.perfil), u.barrio ? `${ico('pin')} ${esc(u.barrio)}` : '', `Miembro desde ${fecha(u.creado)}`,
  ].filter(Boolean).join(' · ');

  /* Cifras */
  const cifra = (icono, color, valor, texto) =>
    `<div class="cifra"><div class="ico-caja ${color}">${ico(icono)}</div><div><b>${valor}</b><span>${texto}</span></div></div>`;
  $('#cifras').innerHTML =
    cifra('libro', '', `${r.lecciones}<small style="font-size:.9rem;color:var(--suave)">/${r.leccionesTotal}</small>`, 'lecciones completadas') +
    cifra('check', 'rio', r.cursosTerminados, 'cursos terminados') +
    cifra('birrete', 'oro', r.certificados, 'certificados') +
    cifra('home', 'tierra', r.diasEstudio, r.diasEstudio === 1 ? 'día de estudio' : 'días de estudio') +
    cifra('grafica', 'rio', r.diagnosticos, 'diagnósticos') +
    cifra('pin', '', r.reportes, 'reportes al mapa');

  pintarCursos();
  pintarEvolucion();
  pintarCertificados();
  pintarActividad();
  pintarListas();
}

function pintarCursos() {
  $('#misCursos').innerHTML = datos.cursos.map(c => {
    const pct = c.total ? Math.round(c.completadas / c.total * 100) : 0;
    const estado = pct === 100 ? `${ico('check')} Terminado` : pct > 0 ? `En curso · ${c.completadas} de ${c.total}` : 'Sin empezar';
    const boton = c.certificado
      ? `<a class="btn sec" href="/certificado?codigo=${encodeURIComponent(c.certificado)}">${ico('birrete')} Certificado</a>`
      : pct === 100
        ? `<button class="btn" data-certificado="${esc(c.id)}">${ico('birrete')} Obtener certificado</button>`
        : `<a class="btn ${pct > 0 ? '' : 'sec'}" href="/aula?curso=${encodeURIComponent(c.id)}">${pct > 0 ? 'Continuar' : 'Empezar'}</a>`;
    return `
      <div class="curso-fila">
        <div class="ico-caja ${esc(c.color)}">${ico(c.icono)}</div>
        <div class="info">
          <b>${esc(c.titulo)}</b>
          <small>${estado}${c.ultima ? ` · último avance ${hace(c.ultima)}` : ''}</small>
          <div class="barra"><span style="width:${pct}%"></span></div>
        </div>
        ${boton}
      </div>`;
  }).join('') || vacioMini('No hay cursos disponibles.');
}

$('#misCursos').addEventListener('click', async e => {
  const b = e.target.closest('[data-certificado]');
  if (!b) return;
  b.disabled = true;
  try {
    const { codigo } = await api('/certificados', { metodo: 'POST', datos: { curso: b.dataset.certificado } });
    location.href = `/certificado?codigo=${encodeURIComponent(codigo)}`;
  } catch (err) {
    toast(err.message, 'error');
    b.disabled = false;
  }
});

function pintarEvolucion() {
  const d = datos.diagnosticos;
  if (!d.length) {
    $('#evolucion').innerHTML = vacioMini('Aún no has hecho tu diagnóstico.') +
      `<a class="btn sec" href="/diagnostico">${ico('grafica')} Hacer diagnóstico</a>`;
    return;
  }
  let tendencia = '';
  if (d.length > 1) {
    const primero = d[0], ultimo = d[d.length - 1];
    const chip = (nombre, dif) => {
      const clase = dif > 0 ? 'sube' : dif < 0 ? 'baja' : 'igual';
      const flecha = dif > 0 ? '▲' : dif < 0 ? '▼' : '=';
      return `<span class="tendencia ${clase}">${flecha} ${nombre} ${dif > 0 ? '+' : ''}${dif}</span>`;
    };
    tendencia = `<div>${chip('Acceso', ultimo.acceso - primero.acceso)}${chip('Habilidades', ultimo.habilidades - primero.habilidades)}
      <small style="color:var(--suave)">desde tu primer diagnóstico</small></div>`;
  }
  $('#evolucion').innerHTML = tendencia + [...d].reverse().map(x => `
    <div class="evo-fila">
      <div class="evo-fecha"><b>${fecha(x.fecha)}</b>${hace(x.fecha)}</div>
      <div class="evo-barras">
        <div class="evo-barra"><span>Acceso</span><div class="barra"><span style="width:${x.acceso}%"></span></div><span>${x.acceso}</span></div>
        <div class="evo-barra hab"><span>Habilidades</span><div class="barra"><span style="width:${x.habilidades}%"></span></div><span>${x.habilidades}</span></div>
      </div>
      <div class="evo-perfil">${esc(x.perfil)}</div>
    </div>`).join('') +
    `<a class="btn fantasma" href="/diagnostico" style="margin-top:10px">${ico('grafica')} Hacer un nuevo diagnóstico</a>`;
}

function pintarCertificados() {
  $('#misCertificados').innerHTML = datos.certificados.length
    ? `<ul class="lista-simple">${datos.certificados.map(c => `
        <li>${ico('birrete')}
          <div class="info"><b>${esc(c.curso_titulo)}</b><small>${fecha(c.fecha)} · ${esc(c.codigo)}</small></div>
          <a class="btn sec btn-mini" href="/certificado?codigo=${encodeURIComponent(c.codigo)}">Ver</a></li>`).join('')}</ul>`
    : vacioMini('Termina un curso para obtener tu primer certificado.');
}

const ACT = {
  leccion: ['libro', '', a => `Completaste la lección <b>${esc(a.titulo)}</b>`, a => esc(a.detalle)],
  certificado: ['birrete', 'oro', a => `Obtuviste el certificado de <b>${esc(a.titulo)}</b>`, a => esc(a.detalle)],
  descarga: ['descargar', 'tierra', a => `Descargaste <b>${esc(a.titulo)}</b>`, a => esc(a.detalle)],
  diagnostico: ['grafica', 'rio', () => 'Hiciste tu <b>diagnóstico digital</b>', a => a.detalle ? esc(a.detalle) : ''],
  reporte: ['pin', '', a => `Reportaste <b>${esc(a.titulo)}</b> en el mapa`, a => TIPO_PUNTO[a.detalle] || ''],
};

function pintarActividad() {
  $('#actividad').innerHTML = datos.actividad.map(a => {
    const [icono, color, texto, detalle] = ACT[a.tipo];
    const extra = detalle(a);
    return `<li><span class="punto-t ${color}">${ico(icono)}</span>
      <div class="texto">${texto(a)}<small>${hace(a.fecha)}${extra ? ' · ' + extra : ''}</small></div></li>`;
  }).join('') || `<li>${vacioMini('Todavía no hay actividad. ¡Empieza con una lección!')}</li>`;
}

function pintarListas() {
  $('#misGuardadas').innerHTML = datos.guardadas.map(o => `
    <li>${ico('estrella')}
      <div class="info"><b>${esc(o.titulo)}</b><small>${esc(o.tipo)} · ${esc(o.entidad)}</small></div>
      <a class="btn sec btn-mini" href="${esc(o.url)}" target="_blank" rel="noopener" aria-label="Abrir sitio oficial">${ico('externo')}</a></li>`).join('')
    || `<li>${vacioMini('No has guardado oportunidades.')} <a href="/oportunidades">Ver oportunidades</a></li>`;

  $('#misDescargas').innerHTML = datos.descargas.map(d => `
    <li>${ico(d.icono || 'documento')}
      <div class="info"><b>${esc(d.titulo)}</b><small>${esc(d.tema)} · ${hace(d.fecha)}</small></div>
      <a class="btn sec btn-mini" href="/api/recursos/${d.id}/descargar" download aria-label="Descargar de nuevo">${ico('descargar')}</a></li>`).join('')
    || `<li>${vacioMini('No has descargado guías.')} <a href="/recursos">Ver recursos</a></li>`;

  $('#misReportes').innerHTML = datos.reportes.map(p => `
    <li>${ico('pin')}
      <div class="info"><b>${esc(p.nombre)}</b><small>${TIPO_PUNTO[p.tipo]} · ${hace(p.creado)}</small></div>
      <span class="etiqueta ${p.verificado ? '' : 'oro'}">${p.verificado ? `${ico('check')} Verificado` : 'Por verificar'}</span></li>`).join('')
    || `<li>${vacioMini('No has reportado puntos.')} <a href="/conectividad">Ir al mapa</a></li>`;
}

/* =================== Diálogos: editar datos y contraseña =================== */
const dialogo = $('#dialogo');
let alGuardar = null;

function abrirDialogo(titulo, html, guardar) {
  $('#dialogoTitulo').textContent = titulo;
  $('#dialogoCuerpo').innerHTML = html;
  $('#dialogoError').textContent = '';
  alGuardar = guardar;
  dialogo.showModal();
  $('input, select', dialogo)?.focus();
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

$('#btnEditar').addEventListener('click', () => {
  const u = datos.usuario;
  abrirDialogo('Editar mis datos', `
    <div class="campo"><label class="t" for="pNombre">Nombre completo</label>
      <input type="text" id="pNombre" name="nombre" value="${esc(u.nombre)}" maxlength="80" required></div>
    <div class="fila-2">
      <div class="campo"><label class="t" for="pPerfil">Soy…</label>
        <select id="pPerfil" name="perfil">${PERFILES.map(p => `<option ${p === u.perfil ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="campo"><label class="t" for="pBarrio">Barrio / sector</label>
        <input type="text" id="pBarrio" name="barrio" value="${esc(u.barrio ?? '')}" maxlength="80"></div>
    </div>
    <p class="ayuda" style="color:var(--suave);font-size:.85rem">Tu correo (${esc(u.correo)}) no se puede cambiar.</p>`,
  async f => {
    const r = await api('/perfil', { metodo: 'PUT', datos: Object.fromEntries(f) });
    recordarUsuario(r.usuario);
    toast('Tus datos se actualizaron.');
    // Recargar para refrescar también el encabezado
    setTimeout(() => location.reload(), 600);
  });
});

$('#btnClave').addEventListener('click', () => {
  abrirDialogo('Cambiar contraseña', `
    <div class="campo"><label class="t" for="cActual">Contraseña actual</label>
      <input type="password" id="cActual" name="actual" autocomplete="current-password" required></div>
    <div class="campo"><label class="t" for="cNueva">Nueva contraseña</label>
      <input type="password" id="cNueva" name="nueva" autocomplete="new-password" minlength="6" placeholder="Mínimo 6 caracteres" required></div>
    <div class="campo"><label class="t" for="cNueva2">Repite la nueva contraseña</label>
      <input type="password" id="cNueva2" name="nueva2" autocomplete="new-password" required></div>
    <p style="color:var(--suave);font-size:.85rem">Por seguridad, se cerrará tu sesión en los demás dispositivos.</p>`,
  async f => {
    if (f.get('nueva') !== f.get('nueva2')) throw new Error('Las contraseñas nuevas no coinciden.');
    await api('/perfil/clave', { metodo: 'PUT', datos: { actual: f.get('actual'), nueva: f.get('nueva') } });
    toast('Contraseña cambiada correctamente.');
  });
});
