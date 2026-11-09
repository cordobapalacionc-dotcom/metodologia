/**
 * API del panel de administración. Todas las rutas exigen rol "admin".
 */
import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion, requiereAdmin, crearCodigoRecuperacion } from '../autenticacion.js';
import { ErrorHttp, texto, idParam, coordenadas } from '../utilidades.js';
import {
  cursosParaEditor, crearCurso, actualizarCurso, borrarCurso, crearLeccion, actualizarLeccion, borrarLeccion,
} from '../servicioCursos.js';
import { listarCopias, crearCopia, rutaCopia } from '../copias.js';
import { calcularImpacto, impactoCsv } from '../impacto.js';
import { TIPOS_PUNTO } from './puntos.js';

const r = Router();
r.use(requiereSesion, requiereAdmin);

/* =================== Resumen =================== */
r.get('/resumen', (_req, res) => {
  const n = sql => db.prepare(sql).get().n;
  res.json({
    usuarios: n('SELECT COUNT(*) AS n FROM usuarios'),
    diagnosticos: n('SELECT COUNT(*) AS n FROM diagnosticos'),
    diagnosticosSemana: n("SELECT COUNT(*) AS n FROM diagnosticos WHERE fecha >= datetime('now','-7 days')"),
    reportesPendientes: n('SELECT COUNT(*) AS n FROM puntos WHERE verificado = 0'),
    certificados: n('SELECT COUNT(*) AS n FROM certificados'),
    leccionesCompletadas: n('SELECT COUNT(*) AS n FROM progreso'),
    cursos: n('SELECT COUNT(*) AS n FROM cursos'),
    oportunidades: n('SELECT COUNT(*) AS n FROM oportunidades'),
  });
});

/* =================== Reportes del mapa =================== */
r.get('/puntos', (_req, res) => {
  res.json(db.prepare(`
    SELECT p.*, u.nombre AS autor, u.correo AS autor_correo
    FROM puntos p LEFT JOIN usuarios u ON u.id = p.reportado_por
    ORDER BY p.verificado ASC, p.creado DESC`).all());
});

function datosPunto(b) {
  const nombre = texto(b.nombre, 80);
  if (nombre.length < 3) throw new ErrorHttp(400, 'Escribe el nombre del lugar.');
  if (!TIPOS_PUNTO.includes(b.tipo)) throw new ErrorHttp(400, 'Tipo no válido.');
  const radio = b.tipo === 'zona' ? Math.min(Math.max(Number(b.radio) || 400, 50), 5000) : null;
  return {
    nombre, tipo: b.tipo, ...coordenadas(b.lat, b.lng), radio,
    horario: texto(b.horario, 80) || null,
    senal: texto(b.senal, 40) || null,
    descripcion: texto(b.descripcion, 300) || null,
  };
}

r.put('/puntos/:id', (req, res) => {
  const id = idParam(req.params.id);
  const p = datosPunto(req.body ?? {});
  const { changes } = db.prepare(`
    UPDATE puntos SET nombre=?, tipo=?, lat=?, lng=?, radio=?, horario=?, senal=?, descripcion=?, verificado=1 WHERE id=?`)
    .run(p.nombre, p.tipo, p.lat, p.lng, p.radio, p.horario, p.senal, p.descripcion, id);
  if (!changes) throw new ErrorHttp(404, 'Punto no encontrado.');
  res.json({ ok: true });
});

r.post('/puntos/:id/verificar', (req, res) => {
  const { changes } = db.prepare('UPDATE puntos SET verificado = 1 WHERE id = ?').run(idParam(req.params.id));
  if (!changes) throw new ErrorHttp(404, 'Punto no encontrado.');
  res.json({ ok: true });
});

r.delete('/puntos/:id', (req, res) => {
  db.prepare('DELETE FROM puntos WHERE id = ?').run(idParam(req.params.id));
  res.json({ ok: true });
});

/* =================== Oportunidades =================== */
const TIPOS_OP = ['Beca', 'Curso', 'Empleo', 'Convocatoria', 'Emprendimiento'];

function datosOportunidad(b) {
  const o = {
    titulo: texto(b.titulo, 120), tipo: b.tipo, entidad: texto(b.entidad, 80),
    descripcion: texto(b.descripcion, 400), url: texto(b.url, 300),
  };
  if (o.titulo.length < 5) throw new ErrorHttp(400, 'El título es muy corto.');
  if (!TIPOS_OP.includes(o.tipo)) throw new ErrorHttp(400, 'Tipo de oportunidad no válido.');
  if (o.entidad.length < 2) throw new ErrorHttp(400, 'Escribe la entidad.');
  if (!/^https?:\/\/[^\s]+\.[^\s]+$/.test(o.url)) throw new ErrorHttp(400, 'El enlace debe empezar por https://');
  return o;
}

r.post('/oportunidades', (req, res) => {
  const o = datosOportunidad(req.body ?? {});
  const { lastInsertRowid } = db.prepare('INSERT INTO oportunidades (titulo, tipo, entidad, descripcion, url) VALUES (?,?,?,?,?)')
    .run(o.titulo, o.tipo, o.entidad, o.descripcion, o.url);
  res.status(201).json({ id: Number(lastInsertRowid) });
});

r.put('/oportunidades/:id', (req, res) => {
  const o = datosOportunidad(req.body ?? {});
  const { changes } = db.prepare('UPDATE oportunidades SET titulo=?, tipo=?, entidad=?, descripcion=?, url=? WHERE id=?')
    .run(o.titulo, o.tipo, o.entidad, o.descripcion, o.url, idParam(req.params.id));
  if (!changes) throw new ErrorHttp(404, 'Oportunidad no encontrada.');
  res.json({ ok: true });
});

r.delete('/oportunidades/:id', (req, res) => {
  db.prepare('DELETE FROM oportunidades WHERE id = ?').run(idParam(req.params.id));
  res.json({ ok: true });
});

/* =================== Cursos y lecciones =================== */
// Lista todos: los de la plataforma y los de grupo (con su facilitador y código)
r.get('/cursos', (_req, res) => res.json(cursosParaEditor()));

r.post('/cursos', (req, res) => res.status(201).json(crearCurso(req.body ?? {})));

r.put('/cursos/:id', (req, res) => {
  actualizarCurso(req.params.id, req.body ?? {});
  res.json({ ok: true });
});

r.delete('/cursos/:id', (req, res) => {
  borrarCurso(req.params.id);
  res.json({ ok: true });
});

r.post('/cursos/:id/lecciones', (req, res) => {
  const curso = db.prepare('SELECT id FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado.');
  res.status(201).json({ id: crearLeccion(curso.id, req.body ?? {}) });
});

r.put('/lecciones/:id', (req, res) => {
  actualizarLeccion(req.params.id, req.body ?? {});
  res.json({ ok: true });
});

r.delete('/lecciones/:id', (req, res) => {
  borrarLeccion(idParam(req.params.id));
  res.json({ ok: true });
});

/* =================== Usuarios =================== */
const ROLES = ['usuario', 'facilitador', 'admin'];

r.get('/usuarios', (_req, res) => {
  res.json(db.prepare(`
    SELECT u.id, u.nombre, u.correo, u.perfil, u.barrio, u.rol, u.creado,
      (SELECT COUNT(*) FROM progreso p WHERE p.usuario_id = u.id) AS lecciones,
      (SELECT COUNT(*) FROM certificados c WHERE c.usuario_id = u.id) AS certificados
    FROM usuarios u ORDER BY u.creado DESC`).all());
});

r.put('/usuarios/:id/rol', (req, res) => {
  const id = idParam(req.params.id);
  const rol = req.body?.rol;
  if (!ROLES.includes(rol)) throw new ErrorHttp(400, 'Rol no válido.');
  if (id === req.usuario.id) throw new ErrorHttp(400, 'No puedes cambiar tu propio rol.');
  const { changes } = db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(rol, id);
  if (!changes) throw new ErrorHttp(404, 'Usuario no encontrado.');
  res.json({ ok: true });
});

/** POST /api/admin/usuarios/:id/recuperacion — código para que la persona cree una contraseña nueva */
r.post('/usuarios/:id/recuperacion', (req, res) => {
  const id = idParam(req.params.id);
  if (id === req.usuario.id) throw new ErrorHttp(400, 'Para cambiar tu propia contraseña usa Mi panel.');
  const u = db.prepare('SELECT nombre, correo FROM usuarios WHERE id = ?').get(id);
  if (!u) throw new ErrorHttp(404, 'Usuario no encontrado.');
  res.status(201).json({ ...u, ...crearCodigoRecuperacion(id, req.usuario.id) });
});

/* =================== Tablero de impacto =================== */
r.get('/impacto', (_req, res) => res.json(calcularImpacto()));

r.get('/impacto.csv', (_req, res) => {
  const fecha = new Date().toISOString().slice(0, 10);
  res.attachment(`impacto-quibdo-conecta-${fecha}.csv`).type('text/csv; charset=utf-8').send('﻿' + impactoCsv(calcularImpacto()));
});

/* =================== Copias de seguridad =================== */
r.get('/copias', (_req, res) => res.json(listarCopias()));

r.post('/copias', (_req, res) => res.status(201).json(crearCopia(true)));

/** Descarga de una copia: contiene datos personales, por eso solo la ven los admins. */
r.get('/copias/:nombre', (req, res) => {
  const ruta = rutaCopia(req.params.nombre);
  if (!ruta) throw new ErrorHttp(404, 'Copia no encontrada.');
  res.download(ruta, req.params.nombre);
});

export default r;
