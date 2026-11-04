import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion } from '../autenticacion.js';
import { ErrorHttp, texto, coordenadas, limitador } from '../utilidades.js';

const r = Router();
export const TIPOS_PUNTO = ['wifi', 'comunitario', 'zona'];

/** GET /api/puntos — puntos de conexión y zonas con dificultad */
r.get('/', (_req, res) => {
  const puntos = db.prepare(`
    SELECT p.id, p.nombre, p.tipo, p.lat, p.lng, p.radio, p.horario, p.senal, p.descripcion, p.verificado,
           u.nombre AS autor
    FROM puntos p LEFT JOIN usuarios u ON u.id = p.reportado_por
    ORDER BY p.verificado DESC, p.id`).all();
  // Del autor solo se muestra el primer nombre
  res.json(puntos.map(p => ({ ...p, verificado: !!p.verificado, autor: p.autor ? p.autor.split(' ')[0] : null })));
});

/** POST /api/puntos — reporte comunitario (queda pendiente de verificación) */
r.post('/', requiereSesion, limitador({ ventanaMin: 60, max: 10, mensaje: 'Has enviado muchos reportes. Intenta más tarde.' }), (req, res) => {
  const nombre = texto(req.body?.nombre, 80);
  const tipo = req.body?.tipo;
  if (nombre.length < 3) throw new ErrorHttp(400, 'Escribe el nombre del lugar o barrio.');
  if (!TIPOS_PUNTO.includes(tipo)) throw new ErrorHttp(400, 'Tipo de reporte no válido.');
  const { lat, lng } = coordenadas(req.body?.lat, req.body?.lng);

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO puntos (nombre, tipo, lat, lng, radio, senal, descripcion, reportado_por, verificado)
    VALUES (?,?,?,?,?,?,?,?,0)`).run(
      nombre, tipo, lat, lng, tipo === 'zona' ? 400 : null, 'Por verificar',
      'Reportado por la comunidad. Pendiente de verificación.', req.usuario.id);
  res.status(201).json({ id: Number(lastInsertRowid) });
});

export default r;
