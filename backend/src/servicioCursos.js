/**
 * Lógica de cursos compartida por el panel de administración y el de facilitadores.
 *
 * Hay dos clases de cursos:
 *  - De la plataforma (codigo_acceso NULL): los ve todo el mundo.
 *  - De grupo (con codigo_acceso): los crea un facilitador y solo los ven él y
 *    los estudiantes que se unieron con el código.
 */
import { db, transaccion } from './db.js';
import { ErrorHttp, texto, idParam, textoAHtml, htmlATexto, codigoAleatorio } from './utilidades.js';

export const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Todos'];
export const ICONOS = ['monitor', 'documento', 'tabla', 'correo', 'escudo', 'libro', 'wifi', 'bombillo', 'maletin', 'grafica'];
export const COLORES = ['', 'rio', 'oro', 'tierra'];

/* =================== Quién puede ver un curso =================== */

/**
 * Condición SQL "este curso es visible para el usuario". Necesita el id del usuario dos veces:
 *   db.prepare(`... WHERE ${VISIBLE('c')}`).all(uid, uid)
 */
export const VISIBLE = (a = 'c') =>
  `(${a}.codigo_acceso IS NULL OR ${a}.autor_id = ? OR EXISTS (
     SELECT 1 FROM inscripciones i WHERE i.curso_id = ${a}.id AND i.usuario_id = ?))`;

/** Id para las consultas de visibilidad (0 = invitado: solo cursos abiertos). */
export const uid = usuario => usuario?.id ?? 0;

/** Devuelve el curso si el usuario puede verlo (los admins ven todos), o null. */
export function cursoVisible(usuario, cursoId) {
  if (usuario?.rol === 'admin') return db.prepare('SELECT * FROM cursos WHERE id = ?').get(cursoId) ?? null;
  return db.prepare(`SELECT * FROM cursos c WHERE c.id = ? AND ${VISIBLE('c')}`)
    .get(cursoId, uid(usuario), uid(usuario)) ?? null;
}

/** Código de invitación nuevo y único, p. ej. "K7P2QX". */
export function nuevoCodigoAcceso() {
  let codigo;
  do codigo = codigoAleatorio(6);
  while (db.prepare('SELECT 1 FROM cursos WHERE codigo_acceso = ?').get(codigo));
  return codigo;
}

/* =================== Validación =================== */

export function datosCurso(b) {
  const c = {
    titulo: texto(b.titulo, 80), nivel: b.nivel, publico: texto(b.publico, 120),
    icono: ICONOS.includes(b.icono) ? b.icono : 'libro',
    color: COLORES.includes(b.color) ? b.color : '',
  };
  if (c.titulo.length < 3) throw new ErrorHttp(400, 'El título del curso es muy corto.');
  if (!NIVELES.includes(c.nivel)) throw new ErrorHttp(400, 'Nivel no válido.');
  return c;
}

export function datosLeccion(b) {
  const l = {
    titulo: texto(b.titulo, 120),
    texto: typeof b.texto === 'string' ? b.texto.trim().slice(0, 5000) : '',
    pregunta: texto(b.pregunta, 300),
    opciones: Array.isArray(b.opciones) ? b.opciones.map(o => texto(o, 150)).filter(Boolean) : [],
    respuesta: Number(b.respuesta),
  };
  if (l.titulo.length < 3) throw new ErrorHttp(400, 'El título de la lección es muy corto.');
  if (l.texto.length < 10) throw new ErrorHttp(400, 'Escribe el contenido de la lección.');
  if (l.pregunta.length < 5) throw new ErrorHttp(400, 'Escribe la pregunta de comprobación.');
  if (l.opciones.length < 2 || l.opciones.length > 5) throw new ErrorHttp(400, 'La pregunta debe tener entre 2 y 5 opciones.');
  if (!Number.isInteger(l.respuesta) || l.respuesta < 0 || l.respuesta >= l.opciones.length)
    throw new ErrorHttp(400, 'Marca cuál opción es la correcta.');
  return l;
}

/* =================== Lectura para los editores =================== */

/** Cursos con sus lecciones completas (incluida la respuesta correcta): solo para editores. */
export function cursosParaEditor(donde = '1 = 1', ...params) {
  const cursos = db.prepare(`
    SELECT c.*, u.nombre AS autor,
      (SELECT COUNT(*) FROM inscripciones i WHERE i.curso_id = c.id) AS estudiantes
    FROM cursos c LEFT JOIN usuarios u ON u.id = c.autor_id
    WHERE ${donde} ORDER BY c.orden`).all(...params);
  if (!cursos.length) return [];
  const lecciones = db.prepare(`
    SELECT * FROM lecciones WHERE curso_id IN (${cursos.map(() => '?').join(',')}) ORDER BY curso_id, orden`)
    .all(...cursos.map(c => c.id));
  return cursos.map(c => ({
    ...c,
    lecciones: lecciones.filter(l => l.curso_id === c.id).map(l => ({
      id: l.id, orden: l.orden, titulo: l.titulo, pregunta: l.pregunta,
      opciones: JSON.parse(l.opciones), respuesta: l.respuesta,
      texto: l.fuente ?? htmlATexto(l.contenido),
    })),
  }));
}

/* =================== Escritura =================== */

const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'curso';

/** Crea un curso. Con autorId es un curso de grupo (privado, con código de invitación). */
export function crearCurso(b, autorId = null) {
  const c = datosCurso(b);
  let id = slug(c.titulo), n = 2;
  while (db.prepare('SELECT 1 FROM cursos WHERE id = ?').get(id)) id = `${slug(c.titulo)}-${n++}`;
  const orden = db.prepare('SELECT COALESCE(MAX(orden), -1) + 1 AS o FROM cursos').get().o;
  const codigo = autorId ? nuevoCodigoAcceso() : null;
  db.prepare('INSERT INTO cursos (id, titulo, icono, color, nivel, publico, orden, autor_id, codigo_acceso) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, c.titulo, c.icono, c.color, c.nivel, c.publico, orden, autorId, codigo);
  return { id, codigo_acceso: codigo };
}

export function actualizarCurso(id, b) {
  const c = datosCurso(b);
  const { changes } = db.prepare('UPDATE cursos SET titulo=?, icono=?, color=?, nivel=?, publico=? WHERE id=?')
    .run(c.titulo, c.icono, c.color, c.nivel, c.publico, id);
  if (!changes) throw new ErrorHttp(404, 'Curso no encontrado.');
}

/** Borra el curso con sus lecciones, avance e inscripciones (cascada). Los certificados se conservan. */
export const borrarCurso = id => db.prepare('DELETE FROM cursos WHERE id = ?').run(id);

export function crearLeccion(cursoId, b) {
  const l = datosLeccion(b);
  const orden = db.prepare('SELECT COALESCE(MAX(orden), -1) + 1 AS o FROM lecciones WHERE curso_id = ?').get(cursoId).o;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO lecciones (curso_id, orden, titulo, contenido, fuente, pregunta, opciones, respuesta) VALUES (?,?,?,?,?,?,?,?)`)
    .run(cursoId, orden, l.titulo, textoAHtml(l.texto), l.texto, l.pregunta, JSON.stringify(l.opciones), l.respuesta);
  return Number(lastInsertRowid);
}

export function actualizarLeccion(id, b) {
  const l = datosLeccion(b);
  const { changes } = db.prepare(`
    UPDATE lecciones SET titulo=?, contenido=?, fuente=?, pregunta=?, opciones=?, respuesta=? WHERE id=?`)
    .run(l.titulo, textoAHtml(l.texto), l.texto, l.pregunta, JSON.stringify(l.opciones), l.respuesta, idParam(id));
  if (!changes) throw new ErrorHttp(404, 'Lección no encontrada.');
}

/** Borra una lección y reordena las siguientes para no dejar huecos. */
export function borrarLeccion(id) {
  transaccion(() => {
    const l = db.prepare('SELECT curso_id, orden FROM lecciones WHERE id = ?').get(id);
    if (!l) return;
    db.prepare('DELETE FROM lecciones WHERE id = ?').run(id);
    const siguientes = db.prepare('SELECT id FROM lecciones WHERE curso_id = ? AND orden > ? ORDER BY orden').all(l.curso_id, l.orden);
    const mover = db.prepare('UPDATE lecciones SET orden = ? WHERE id = ?');
    siguientes.forEach((s, i) => mover.run(l.orden + i, s.id));
  });
}
