/** Aula virtual: lista de cursos y lecciones con preguntas de comprobación. */
import { api } from './api.js';
import { $, ico, esc, esqueletos, vacio, toast, iniciarPagina } from './comun.js';

const usuario = await iniciarPagina();
const lista = $('#listaCursos');
const vista = $('#vistaLeccion');
let curso = null;   // curso abierto
let indice = 0;     // lección actual

if (!usuario) $('#avisoInvitado').hidden = false;

/* ---------- Lista de cursos ---------- */
async function mostrarLista() {
  curso = null;
  vista.hidden = true;
  $('#seccionLista').hidden = false;
  lista.innerHTML = esqueletos(5);
  try {
    const cursos = await api('/cursos');
    lista.innerHTML = cursos.map(c => {
      const pct = Math.round(c.completadas / c.total * 100);
      const accion = pct === 100 ? 'Repasar' : pct > 0 ? 'Continuar' : 'Empezar';
      return `
        <article class="card card-flex ${c.grupo ? 'grupo' : ''}">
          <div class="ico-caja ${c.color}">${ico(c.icono, 'ico-grande')}</div>
          <h3>${esc(c.titulo)}</h3>
          ${c.grupo ? `<div><span class="etiqueta rio">${ico('usuarios')} Curso de grupo${c.facilitador ? ` · ${esc(c.facilitador)}` : ''}</span></div>` : ''}
          <div><span class="etiqueta">${esc(c.nivel)}</span><span class="etiqueta rio">${ico('libro')} ${c.total} lecciones</span></div>
          <p>${esc(c.publico)}</p>
          <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance"><span style="width:${pct}%"></span></div>
          <div class="acciones">
            <a class="btn ${pct === 100 ? 'sec' : ''}" href="?curso=${c.id}" data-curso="${c.id}">${accion} ${ico('der')}</a>
            ${pct === 100 && usuario
              ? `<button class="btn" data-certificado="${c.id}">${ico('birrete')} Certificado</button>`
              : `<small style="color:var(--suave)">${pct}%</small>`}
          </div>
        </article>`;
    }).join('');
  } catch (e) {
    lista.innerHTML = vacio('wifi-off', e.message);
  }
}

/* ---------- Certificado ---------- */
async function obtenerCertificado(cursoId, boton) {
  boton.disabled = true;
  try {
    const { codigo } = await api('/certificados', { metodo: 'POST', datos: { curso: cursoId } });
    location.href = `/certificado?codigo=${encodeURIComponent(codigo)}`;
  } catch (e) {
    toast(e.message, 'error');
    boton.disabled = false;
  }
}

lista.addEventListener('click', e => {
  const cert = e.target.closest('[data-certificado]');
  if (cert) { obtenerCertificado(cert.dataset.certificado, cert); return; }
  const a = e.target.closest('[data-curso]');
  if (!a) return;
  e.preventDefault();
  history.pushState({}, '', `?curso=${a.dataset.curso}`);
  abrirCurso(a.dataset.curso);
});

/* ---------- Curso y lecciones ---------- */
async function abrirCurso(id) {
  $('#seccionLista').hidden = true;
  vista.hidden = false;
  vista.innerHTML = '<div class="esqueleto" style="min-height:320px"></div>';
  try {
    curso = await api('/cursos/' + encodeURIComponent(id));
    // Abrir en la primera lección pendiente
    const pendiente = curso.lecciones.findIndex(l => !l.completada);
    indice = pendiente === -1 ? 0 : pendiente;
    pintarLeccion();
  } catch (e) {
    vista.innerHTML = vacio('alerta', e.message) + `<button class="btn fantasma" data-accion="volver">${ico('izq')} Volver</button>`;
  }
}

function pintarLeccion() {
  const l = curso.lecciones[indice];
  const n = curso.lecciones.length;
  const terminado = usuario && curso.lecciones.every(x => x.completada);
  vista.innerHTML = `
    <button class="btn fantasma volver" data-accion="volver">${ico('izq')} Volver a los cursos</button>
    ${terminado ? `
      <div class="aviso info">${ico('birrete')}
        <span>¡Terminaste este curso! Ya puedes descargar tu certificado.</span>
        <button class="btn" data-accion="certificado" style="margin-left:auto">${ico('descargar')} Ver certificado</button>
      </div>` : ''}
    <article class="leccion">
      <span class="etiqueta">${ico(curso.icono)} ${esc(curso.titulo)}</span>
      <span class="etiqueta oro">Lección ${indice + 1} de ${n}</span>
      <nav class="pasos" aria-label="Lecciones del curso">
        ${curso.lecciones.map((x, i) => `
          <button data-ir="${i}" class="${x.completada ? 'hecho' : ''}" ${i === indice ? 'aria-current="step"' : ''}
            aria-label="Lección ${i + 1}${x.completada ? ' (completada)' : ''}">${x.completada ? '✓' : i + 1}</button>`).join('')}
      </nav>
      <h3>${esc(l.titulo)}</h3>
      ${l.contenido}
      <hr>
      <div class="quiz">
        <b>${ico('check')} Comprueba lo aprendido</b>
        <p>${esc(l.pregunta)}</p>
        <div class="opciones" role="radiogroup">
          ${l.opciones.map((o, k) => `<label><input type="radio" name="opcion" value="${k}"> ${esc(o)}</label>`).join('')}
        </div>
        <p id="retro" aria-live="polite">${l.completada ? `<span class="correcto">${ico('check')} Ya completaste esta lección.</span>` : ''}</p>
        <div class="acciones">
          <button class="btn" data-accion="responder">Responder</button>
          ${indice > 0 ? `<button class="btn sec" data-ir="${indice - 1}">${ico('izq')} Anterior</button>` : ''}
          ${indice < n - 1 ? `<button class="btn sec" data-ir="${indice + 1}">Siguiente ${ico('der')}</button>` : ''}
        </div>
      </div>
    </article>`;
}

async function responder(boton) {
  const sel = $('input[name=opcion]:checked', vista);
  const retro = $('#retro');
  if (!sel) { retro.textContent = 'Selecciona una respuesta.'; return; }
  const l = curso.lecciones[indice];
  boton.disabled = true;
  try {
    const r = await api(`/cursos/lecciones/${l.id}/responder`, { metodo: 'POST', datos: { opcion: Number(sel.value) } });
    if (!r.correcto) {
      retro.innerHTML = `<span class="incorrecto">${ico('alerta')} Casi. Lee de nuevo la lección e inténtalo otra vez.</span>`;
      return;
    }
    if (r.guardado) l.completada = true;
    const terminado = curso.lecciones.every(x => x.completada);
    pintarLeccion();
    $('#retro').innerHTML = `<span class="correcto">${ico('check')} ¡Correcto!${r.guardado ? ' Lección completada.' : ' (Inicia sesión para guardar tu avance.)'}</span>`;
    if (terminado && r.guardado) toast(`¡Felicitaciones! Terminaste el curso “${curso.titulo}”.`);
  } catch (e) {
    retro.innerHTML = `<span class="incorrecto">${ico('alerta')} ${esc(e.message)}</span>`;
  } finally {
    boton.disabled = false;
  }
}

vista.addEventListener('click', e => {
  const ir = e.target.closest('[data-ir]');
  if (ir) { indice = Number(ir.dataset.ir); pintarLeccion(); vista.scrollIntoView({ behavior: 'smooth' }); return; }
  const accion = e.target.closest('[data-accion]')?.dataset.accion;
  if (accion === 'volver') { history.pushState({}, '', location.pathname); mostrarLista(); }
  if (accion === 'responder') responder(e.target.closest('button'));
  if (accion === 'certificado') obtenerCertificado(curso.id, e.target.closest('button'));
});

/* ---------- Unirse a un curso de grupo con el código del facilitador ---------- */
async function unirse(codigo) {
  const err = $('#errUnirse');
  err.textContent = '';
  if (!usuario) {
    err.innerHTML = `${ico('usuario')} Para unirte a un curso necesitas una cuenta.
      <a href="/?registro&unirse=${encodeURIComponent(codigo)}">Crea una gratis</a> o <a href="/?unirse=${encodeURIComponent(codigo)}">inicia sesión</a>.`;
    return;
  }
  const boton = $('#formUnirse button');
  boton.disabled = true;
  try {
    const c = await api('/cursos/unirse', { metodo: 'POST', datos: { codigo } });
    toast(c.nuevo ? `Te uniste al curso “${c.titulo}”.` : `Ya estabas en el curso “${c.titulo}”.`);
    $('#codigoCurso').value = '';
    history.pushState({}, '', `?curso=${encodeURIComponent(c.id)}`);
    abrirCurso(c.id);
  } catch (e) {
    err.innerHTML = `${ico('alerta')} ${esc(e.message)}`;
  } finally {
    boton.disabled = false;
  }
}

$('#formUnirse').addEventListener('submit', e => {
  e.preventDefault();
  const codigo = $('#codigoCurso').value.trim();
  if (!codigo) { $('#errUnirse').textContent = 'Escribe el código que te dio tu facilitador.'; return; }
  unirse(codigo);
});

/* ---------- Navegación con la URL (/aula?curso=word · /aula?unirse=K7P2QX) ---------- */
function segunUrl() {
  const params = new URLSearchParams(location.search);
  const codigo = params.get('unirse');
  if (codigo) {
    history.replaceState({}, '', location.pathname);
    mostrarLista();
    $('#codigoCurso').value = codigo;
    unirse(codigo);
    return;
  }
  const id = params.get('curso');
  id ? abrirCurso(id) : mostrarLista();
}
addEventListener('popstate', segunUrl);
segunUrl();
