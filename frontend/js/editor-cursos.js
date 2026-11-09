/**
 * Editor de cursos y lecciones, compartido por el panel de administración (/admin)
 * y el del facilitador (/facilitador). Cada uno usa su propia API (base).
 */
import { api } from './api.js';
import { ico, esc, vacio, toast } from './comun.js';
import { abrirDialogo, confirmarYHacer, opciones, opcionesArr } from './dialogo.js';

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Todos'];
const ICONOS = { monitor: 'Computador', documento: 'Documento', tabla: 'Tabla', correo: 'Correo', escudo: 'Seguridad',
                 libro: 'Libro', wifi: 'Wi-Fi', bombillo: 'Idea', maletin: 'Trabajo', grafica: 'Gráfica' };
const COLORES = { '': 'Verde', rio: 'Azul', oro: 'Amarillo', tierra: 'Café' };

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
  const lista = [];
  let respuesta = -1;
  todas.forEach((o, i) => {
    if (!o.trim()) return;
    if (String(i) === marcada) respuesta = lista.length;
    lista.push(o.trim());
  });
  if (marcada !== null && respuesta === -1) throw new Error('La opción marcada como correcta está vacía.');
  return { titulo: f.get('titulo'), texto: f.get('texto'), pregunta: f.get('pregunta'), opciones: lista, respuesta };
}

/**
 * Monta el editor.
 *   base         '/admin' o '/facilitador'
 *   contenedor   elemento donde se pintan los cursos
 *   botonNuevo   botón "Nuevo curso"
 *   extra(c)     HTML adicional bajo la cabecera de cada curso (código de invitación, autor…)
 *   alPintar(cursos) se llama después de cada carga
 *   textoVacio   mensaje cuando no hay cursos
 */
export function montarEditorCursos({ base, contenedor, botonNuevo, extra = () => '', alPintar = () => {}, textoVacio, avisoBorrar = '' }) {
  let cursos = [];
  const enc = id => encodeURIComponent(id);

  async function cargar() {
    cursos = await api(`${base}/cursos`);
    contenedor.innerHTML = cursos.map(c => `
      <div class="card curso-admin">
        <div class="cab">
          <div class="ico-caja ${esc(c.color)}">${ico(c.icono)}</div>
          <h3>${esc(c.titulo)} <small class="etiqueta">${esc(c.nivel)}</small></h3>
          <div class="acciones">
            <button class="btn btn-mini" data-nueva-leccion="${esc(c.id)}">+ Lección</button>
            <button class="btn sec btn-mini" data-editar-curso="${esc(c.id)}">Editar</button>
            <button class="btn peligro btn-mini" data-borrar-curso="${esc(c.id)}" aria-label="Eliminar curso ${esc(c.titulo)}">${ico('papelera')}</button>
          </div>
        </div>
        ${extra(c)}
        <ol class="lecciones-admin">
          ${c.lecciones.map((l, i) => `
            <li>
              <span class="num">${i + 1}</span>
              <span class="tit">${esc(l.titulo)}</span>
              <button class="btn-icono" data-editar-leccion="${l.id}" data-curso="${esc(c.id)}" aria-label="Editar lección">${ico('documento')}</button>
              <button class="btn-icono" data-borrar-leccion="${l.id}" aria-label="Eliminar lección">${ico('papelera')}</button>
            </li>`).join('') || '<li><span class="tit"><i>Este curso aún no tiene lecciones.</i></span></li>'}
        </ol>
      </div>`).join('') || vacio('libro', textoVacio ?? 'No hay cursos todavía.');
    alPintar(cursos);
  }

  botonNuevo.addEventListener('click', () => abrirDialogo('Nuevo curso', formCurso(), async f => {
    await api(`${base}/cursos`, { metodo: 'POST', datos: Object.fromEntries(f) });
    toast('Curso creado. Ahora agrégale lecciones.');
    cargar();
  }));

  contenedor.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    const curso = cursos.find(c => c.id === (d.curso ?? d.editarCurso ?? d.nuevaLeccion ?? d.borrarCurso));
    if (!curso) return;

    if (d.editarCurso) abrirDialogo('Editar curso', formCurso(curso), async f => {
      await api(`${base}/cursos/${enc(curso.id)}`, { metodo: 'PUT', datos: Object.fromEntries(f) });
      toast('Curso actualizado.');
      cargar();
    });

    if (d.borrarCurso) confirmarYHacer(
      `¿Eliminar el curso "${curso.titulo}" con todas sus lecciones y el avance de los estudiantes?${avisoBorrar} Los certificados ya emitidos seguirán siendo válidos.`,
      async () => {
        await api(`${base}/cursos/${enc(curso.id)}`, { metodo: 'DELETE' });
        toast('Curso eliminado.');
        cargar();
      });

    if (d.nuevaLeccion) abrirDialogo(`Nueva lección · ${curso.titulo}`, formLeccion(), async f => {
      await api(`${base}/cursos/${enc(curso.id)}/lecciones`, { metodo: 'POST', datos: datosLeccion(f) });
      toast('Lección agregada.');
      cargar();
    });

    if (d.editarLeccion) {
      const l = curso.lecciones.find(x => x.id === Number(d.editarLeccion));
      abrirDialogo(`Editar lección · ${curso.titulo}`, formLeccion(l), async f => {
        await api(`${base}/lecciones/${l.id}`, { metodo: 'PUT', datos: datosLeccion(f) });
        toast('Lección actualizada.');
        cargar();
      });
    }
  });

  // Borrar lección: el botón no lleva data-curso, se maneja aparte
  contenedor.addEventListener('click', e => {
    const b = e.target.closest('[data-borrar-leccion]');
    if (!b) return;
    confirmarYHacer('¿Eliminar esta lección? También se borrará el avance de quienes la completaron.', async () => {
      await api(`${base}/lecciones/${b.dataset.borrarLeccion}`, { metodo: 'DELETE' });
      toast('Lección eliminada.');
      cargar();
    });
  });

  return { cargar, cursos: () => cursos };
}
