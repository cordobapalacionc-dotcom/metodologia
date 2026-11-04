import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion } from '../autenticacion.js';
import { ErrorHttp, idParam } from '../utilidades.js';

const r = Router();

/** GET /api/cursos — lista de cursos con el avance del usuario (si hay sesión) */
r.get('/', (req, res) => {
  const cursos = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total
    FROM cursos c ORDER BY c.orden`).all();
  const hechas = req.usuario
    ? db.prepare(`
        SELECT l.curso_id, COUNT(*) AS n FROM progreso p
        JOIN lecciones l ON l.id = p.leccion_id
        WHERE p.usuario_id = ? GROUP BY l.curso_id`).all(req.usuario.id)
    : [];
  const mapa = Object.fromEntries(hechas.map(h => [h.curso_id, h.n]));
  res.json(cursos.map(c => ({ ...c, completadas: mapa[c.id] || 0 })));
});

/** GET /api/cursos/progreso — resumen para la página de inicio */
r.get('/progreso', requiereSesion, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM lecciones').get().n;
  const hechas = db.prepare('SELECT COUNT(*) AS n FROM progreso WHERE usuario_id = ?').get(req.usuario.id).n;
  const terminados = db.prepare(`
    SELECT COUNT(*) AS n FROM cursos c
    WHERE (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) =
          (SELECT COUNT(*) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
           WHERE l.curso_id = c.id AND p.usuario_id = ?)`).get(req.usuario.id).n;
  const cursos = db.prepare('SELECT COUNT(*) AS n FROM cursos').get().n;
  res.json({ total, hechas, terminados, cursos });
});

/** GET /api/cursos/:id — curso con sus lecciones (sin la respuesta correcta) */
r.get('/:id', (req, res) => {
  const curso = db.prepare('SELECT * FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado.');
  const lecciones = db.prepare(`
    SELECT id, orden, titulo, contenido, pregunta, opciones
    FROM lecciones WHERE curso_id = ? ORDER BY orden`).all(curso.id);
  const hechas = new Set(req.usuario
    ? db.prepare('SELECT leccion_id FROM progreso WHERE usuario_id = ?').all(req.usuario.id).map(x => x.leccion_id)
    : []);
  res.json({
    ...curso,
    lecciones: lecciones.map(l => ({ ...l, opciones: JSON.parse(l.opciones), completada: hechas.has(l.id) })),
  });
});

/** POST /api/cursos/lecciones/:id/responder — el servidor corrige la respuesta */
r.post('/lecciones/:id/responder', (req, res) => {
  const leccion = db.prepare('SELECT id, respuesta FROM lecciones WHERE id = ?').get(idParam(req.params.id));
  if (!leccion) throw new ErrorHttp(404, 'Lección no encontrada.');
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
