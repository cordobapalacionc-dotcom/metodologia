import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requiereSesion } from '../autenticacion.js';
import { ErrorHttp, texto } from '../utilidades.js';

const r = Router();

// Código legible, sin letras que se confundan (0/O, 1/I)
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function nuevoCodigo() {
  const bytes = crypto.randomBytes(10);
  const c = [...bytes].map(b => ALFABETO[b % ALFABETO.length]).join('');
  return `QC-${c.slice(0, 5)}-${c.slice(5)}`;
}

/** POST /api/certificados { curso } — emite (o devuelve) el certificado de un curso terminado */
r.post('/', requiereSesion, (req, res) => {
  const cursoId = texto(req.body?.curso, 60);
  const curso = db.prepare('SELECT id, titulo FROM cursos WHERE id = ?').get(cursoId);
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado.');

  const existente = db.prepare('SELECT codigo FROM certificados WHERE usuario_id = ? AND curso_id = ?').get(req.usuario.id, curso.id);
  if (existente) return res.json({ codigo: existente.codigo });

  const { total, hechas } = db.prepare(`
    SELECT (SELECT COUNT(*) FROM lecciones WHERE curso_id = ?) AS total,
           (SELECT COUNT(*) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
            WHERE l.curso_id = ? AND p.usuario_id = ?) AS hechas`).get(curso.id, curso.id, req.usuario.id);
  if (!total || hechas < total) throw new ErrorHttp(400, `Te faltan ${total - hechas} lecciones para obtener el certificado.`);

  const codigo = nuevoCodigo();
  db.prepare('INSERT INTO certificados (codigo, usuario_id, curso_id, curso_titulo, lecciones) VALUES (?,?,?,?,?)')
    .run(codigo, req.usuario.id, curso.id, curso.titulo, total);
  res.status(201).json({ codigo });
});

/** GET /api/certificados/mios */
r.get('/mios', requiereSesion, (req, res) => {
  res.json(db.prepare('SELECT codigo, curso_id, curso_titulo, fecha FROM certificados WHERE usuario_id = ? ORDER BY fecha DESC')
    .all(req.usuario.id));
});

/** GET /api/certificados/:codigo — verificación pública */
r.get('/:codigo', (req, res) => {
  const codigo = texto(req.params.codigo, 20).toUpperCase();
  const c = db.prepare(`
    SELECT c.codigo, c.curso_titulo, c.lecciones, c.fecha, u.nombre
    FROM certificados c JOIN usuarios u ON u.id = c.usuario_id WHERE c.codigo = ?`).get(codigo);
  if (!c) throw new ErrorHttp(404, 'No existe un certificado con ese código.');
  res.json(c);
});

export default r;
