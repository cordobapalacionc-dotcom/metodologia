import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion } from '../autenticacion.js';
import { ErrorHttp, idParam } from '../utilidades.js';

const r = Router();

/** GET /api/oportunidades?tipo=Beca */
r.get('/', async (req, res) => {
  const { tipo } = req.query;
  const filas = typeof tipo === 'string' && tipo
    ? await db.prepare('SELECT * FROM oportunidades WHERE tipo = ? ORDER BY id').all(tipo)
    : await db.prepare('SELECT * FROM oportunidades ORDER BY id').all();
  const guardadas = new Set(req.usuario
    ? (await db.prepare('SELECT oportunidad_id FROM guardadas WHERE usuario_id = ?').all(req.usuario.id)).map(g => g.oportunidad_id)
    : []);
  res.json(filas.map(o => ({ ...o, guardada: guardadas.has(o.id) })));
});

async function existe(id) {
  if (!await db.prepare('SELECT 1 FROM oportunidades WHERE id = ?').get(id)) throw new ErrorHttp(404, 'Oportunidad no encontrada.');
}

/** PUT /api/oportunidades/:id/guardada — guardar */
r.put('/:id/guardada', requiereSesion, async (req, res) => {
  const id = idParam(req.params.id);
  await existe(id);
  await db.prepare('INSERT INTO guardadas (usuario_id, oportunidad_id) VALUES (?,?) ON CONFLICT DO NOTHING').run(req.usuario.id, id);
  res.json({ guardada: true });
});

/** DELETE /api/oportunidades/:id/guardada — quitar de guardadas */
r.delete('/:id/guardada', requiereSesion, async (req, res) => {
  const id = idParam(req.params.id);
  await db.prepare('DELETE FROM guardadas WHERE usuario_id = ? AND oportunidad_id = ?').run(req.usuario.id, id);
  res.json({ guardada: false });
});

export default r;
