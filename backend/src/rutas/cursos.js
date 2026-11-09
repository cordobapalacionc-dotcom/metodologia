import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion } from '../autenticacion.js';
import { ErrorHttp, idParam, limitador, normalizarCodigo } from '../utilidades.js';
import { VISIBLE, uid, cursoVisible } from '../servicioCursos.js';

const r = Router();

/**
 * GET /api/cursos — cursos que puede ver el usuario (los abiertos, los de sus grupos
 * y los que él creó) con su avance. Nunca incluye el código de invitación.
 */
r.get('/', (req, res) => {
  const u = uid(req.usuario);
  const cursos = db.prepare(`
    SELECT c.id, c.titulo, c.icono, c.color, c.nivel, c.publico, c.orden,
      c.codigo_acceso IS NOT NULL AS grupo, a.nombre AS facilitador,
      (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total
    FROM cursos c LEFT JOIN usuarios a ON a.id = c.autor_id
    WHERE ${VISIBLE('c')} ORDER BY grupo DESC, c.orden`).all(u, u);
  const hechas = req.usuario
    ? db.prepare(`
        SELECT l.curso_id, COUNT(*) AS n FROM progreso p
        JOIN lecciones l ON l.id = p.leccion_id
        WHERE p.usuario_id = ? GROUP BY l.curso_id`).all(req.usuario.id)
    : [];
  const mapa = Object.fromEntries(hechas.map(h => [h.curso_id, h.n]));
  res.json(cursos.map(c => ({
    ...c, grupo: !!c.grupo, facilitador: c.grupo ? c.facilitador : null, completadas: mapa[c.id] || 0,
  })));
});

/** GET /api/cursos/progreso — resumen para la página de inicio (solo cursos visibles) */
r.get('/progreso', requiereSesion, (req, res) => {
  const u = req.usuario.id;
  const filas = db.prepare(`
    SELECT (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total,
           (SELECT COUNT(*) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
            WHERE l.curso_id = c.id AND p.usuario_id = ?) AS hechas
    FROM cursos c WHERE ${VISIBLE('c')}`).all(u, u, u);
  res.json({
    total: filas.reduce((s, f) => s + f.total, 0),
    hechas: filas.reduce((s, f) => s + f.hechas, 0),
    terminados: filas.filter(f => f.total && f.hechas === f.total).length,
    cursos: filas.length,
  });
});

/**
 * POST /api/cursos/unirse { codigo } — entrar al curso de un facilitador con su código.
 * Limitado para que no se puedan probar códigos al azar.
 */
r.post('/unirse', requiereSesion, limitador({ ventanaMin: 15, max: 20 }), (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  if (codigo.length !== 6) throw new ErrorHttp(400, 'El código del curso tiene 6 caracteres. Revísalo e inténtalo de nuevo.');
  const curso = db.prepare('SELECT id, titulo FROM cursos WHERE codigo_acceso = ?').get(codigo);
  if (!curso) throw new ErrorHttp(404, 'No hay ningún curso con ese código. Pídelo de nuevo a tu facilitador.');
  const { changes } = db.prepare('INSERT OR IGNORE INTO inscripciones (usuario_id, curso_id) VALUES (?,?)').run(req.usuario.id, curso.id);
  res.status(changes ? 201 : 200).json({ ...curso, nuevo: !!changes });
});

/** GET /api/cursos/:id — curso con sus lecciones (sin la respuesta correcta) */
r.get('/:id', (req, res) => {
  const curso = cursoVisible(req.usuario, req.params.id);
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado. Si es el curso de un grupo, únete primero con el código de tu facilitador.');
  const lecciones = db.prepare(`
    SELECT id, orden, titulo, contenido, pregunta, opciones
    FROM lecciones WHERE curso_id = ? ORDER BY orden`).all(curso.id);
  const hechas = new Set(req.usuario
    ? db.prepare('SELECT leccion_id FROM progreso WHERE usuario_id = ?').all(req.usuario.id).map(x => x.leccion_id)
    : []);
  const { codigo_acceso, autor_id, ...publico } = curso;
  res.json({
    ...publico,
    grupo: !!codigo_acceso,
    lecciones: lecciones.map(l => ({ ...l, opciones: JSON.parse(l.opciones), completada: hechas.has(l.id) })),
  });
});

/** POST /api/cursos/lecciones/:id/responder — el servidor corrige la respuesta */
r.post('/lecciones/:id/responder', (req, res) => {
  const leccion = db.prepare('SELECT id, curso_id, respuesta FROM lecciones WHERE id = ?').get(idParam(req.params.id));
  if (!leccion || !cursoVisible(req.usuario, leccion.curso_id)) throw new ErrorHttp(404, 'Lección no encontrada.');
  const opcion = Number(req.body?.opcion);
  if (!Number.isInteger(opcion)) throw new ErrorHttp(400, 'Selecciona una respuesta.');

  const correcto = opcion === leccion.respuesta;
  let guardado = false;
  if (correcto && req.usuario) {
    db.prepare('INSERT OR IGNORE INTO progreso (usuario_id, leccion_id) VALUES (?,?)').run(req.usuario.id, leccion.id);
    guardado = true;
  }
  res.json({ correcto, guardado });
});

export default r;
