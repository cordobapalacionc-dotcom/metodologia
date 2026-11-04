import { Router } from 'express';
import { db } from '../db.js';
import { ErrorHttp, idParam } from '../utilidades.js';

const r = Router();

/** GET /api/recursos — lista con un resumen corto (sin el contenido completo) */
r.get('/', (req, res) => {
  const recursos = db.prepare('SELECT id, titulo, tipo, tema, icono, extension, contenido FROM recursos ORDER BY id').all();
  const descargados = new Set(req.usuario
    ? db.prepare('SELECT recurso_id FROM descargas WHERE usuario_id = ?').all(req.usuario.id).map(d => d.recurso_id)
    : []);
  res.json(recursos.map(({ contenido, ...r }) => ({
    ...r,
    resumen: contenido.split('\n').filter(Boolean).slice(1, 3).join(' · '),
    tamano: Buffer.byteLength(contenido),
    descargado: descargados.has(r.id),
  })));
});

/** GET /api/recursos/:id/descargar — descarga el archivo y registra la descarga */
r.get('/:id/descargar', (req, res) => {
  const recurso = db.prepare('SELECT * FROM recursos WHERE id = ?').get(idParam(req.params.id));
  if (!recurso) throw new ErrorHttp(404, 'Recurso no encontrado.');
  if (req.usuario) {
    db.prepare('INSERT OR IGNORE INTO descargas (usuario_id, recurso_id) VALUES (?,?)').run(req.usuario.id, recurso.id);
  }
  const nombre = recurso.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w ]/g, '').trim().replace(/\s+/g, '_') + '.' + recurso.extension;
  const csv = recurso.extension === 'csv';
  res.attachment(nombre);
  res.type(csv ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8');
  // BOM para que Excel/Bloc de notas muestren bien las tildes
  res.send('﻿' + recurso.contenido + (csv ? '' : '\n\n— Quibdó Conecta'));
});

export default r;
