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
import { listarCopias, crearCopia, leerCopia } from '../copias.js';
import { calcularImpacto, impactoCsv } from '../impacto.js';
import { TIPOS_PUNTO } from './puntos.js';

const r = Router();
r.use(requiereSesion, requiereAdmin);

/* =================== Resumen =================== */
r.get('/resumen', async (_req, res) => {
  const n = async sql => (await db.prepare(sql).get()).n;
  res.json({
    usuarios: await n('SELECT COUNT(*) AS n FROM usuarios'),
    diagnosticos: await n('SELECT COUNT(*) AS n FROM diagnosticos'),
    diagnosticosSemana: await n("SELECT COUNT(*) AS n FROM diagnosticos WHERE fecha >= datetime('now','-7 days')"),
    reportesPendientes: await n('SELECT COUNT(*) AS n FROM puntos WHERE verificado = 0'),
    certificados: await n('SELECT COUNT(*) AS n FROM certificados'),
    leccionesCompletadas: await n('SELECT COUNT(*) AS n FROM progreso'),
    cursos: await n('SELECT COUNT(*) AS n FROM cursos'),
    oportunidades: await n('SELECT COUNT(*) AS n FROM oportunidades'),
  });
});

/* =================== Reportes del mapa =================== */
r.get('/puntos', async (_req, res) => {
  res.json(await db.prepare(`
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

r.put('/puntos/:id', async (req, res) => {
  const id = idParam(req.params.id);
  const p = datosPunto(req.body ?? {});
  const { changes } = await db.prepare(`
    UPDATE puntos SET nombre=?, tipo=?, lat=?, lng=?, radio=?, horario=?, senal=?, descripcion=?, verificado=1 WHERE id=?`)
    .run(p.nombre, p.tipo, p.lat, p.lng, p.radio, p.horario, p.senal, p.descripcion, id);
  if (!changes) throw new ErrorHttp(404, 'Punto no encontrado.');
  res.json({ ok: true });
});

r.post('/puntos/:id/verificar', async (req, res) => {
  const { changes } = await db.prepare('UPDATE puntos SET verificado = 1 WHERE id = ?').run(idParam(req.params.id));
  if (!changes) throw new ErrorHttp(404, 'Punto no encontrado.');
  res.json({ ok: true });
});

r.delete('/puntos/:id', async (req, res) => {
  await db.prepare('DELETE FROM puntos WHERE id = ?').run(idParam(req.params.id));
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

r.post('/oportunidades', async (req, res) => {
  const o = datosOportunidad(req.body ?? {});
  const { lastInsertRowid } = await db.prepare('INSERT INTO oportunidades (titulo, tipo, entidad, descripcion, url) VALUES (?,?,?,?,?)')
    .run(o.titulo, o.tipo, o.entidad, o.descripcion, o.url);
  res.status(201).json({ id: Number(lastInsertRowid) });
});

r.put('/oportunidades/:id', async (req, res) => {
  const o = datosOportunidad(req.body ?? {});
  const { changes } = await db.prepare('UPDATE oportunidades SET titulo=?, tipo=?, entidad=?, descripcion=?, url=? WHERE id=?')
    .run(o.titulo, o.tipo, o.entidad, o.descripcion, o.url, idParam(req.params.id));
  if (!changes) throw new ErrorHttp(404, 'Oportunidad no encontrada.');
  res.json({ ok: true });
});

r.delete('/oportunidades/:id', async (req, res) => {
  await db.prepare('DELETE FROM oportunidades WHERE id = ?').run(idParam(req.params.id));
  res.json({ ok: true });
});

/* =================== Cursos y lecciones =================== */
// Lista todos: los de la plataforma y los de grupo (con su facilitador y código)
r.get('/cursos', async (_req, res) => res.json(await cursosParaEditor()));

r.post('/cursos', async (req, res) => res.status(201).json(await crearCurso(req.body ?? {})));

r.put('/cursos/:id', async (req, res) => {
  await actualizarCurso(req.params.id, req.body ?? {});
  res.json({ ok: true });
});

r.delete('/cursos/:id', async (req, res) => {
  await borrarCurso(req.params.id);
  res.json({ ok: true });
});

r.post('/cursos/:id/lecciones', async (req, res) => {
  const curso = await db.prepare('SELECT id FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado.');
  res.status(201).json({ id: await crearLeccion(curso.id, req.body ?? {}) });
});

r.put('/lecciones/:id', async (req, res) => {
  await actualizarLeccion(req.params.id, req.body ?? {});
  res.json({ ok: true });
});

r.delete('/lecciones/:id', async (req, res) => {
  await borrarLeccion(idParam(req.params.id));
  res.json({ ok: true });
});

/* =================== Usuarios =================== */
const ROLES = ['usuario', 'facilitador', 'admin'];

r.get('/usuarios', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT u.id, u.nombre, u.correo, u.perfil, u.barrio, u.rol, u.creado,
      (SELECT COUNT(*) FROM progreso p WHERE p.usuario_id = u.id) AS lecciones,
      (SELECT COUNT(*) FROM certificados c WHERE c.usuario_id = u.id) AS certificados
    FROM usuarios u ORDER BY u.creado DESC`).all());
});

r.put('/usuarios/:id/rol', async (req, res) => {
  const id = idParam(req.params.id);
  const rol = req.body?.rol;
  if (!ROLES.includes(rol)) throw new ErrorHttp(400, 'Rol no válido.');
  if (id === req.usuario.id) throw new ErrorHttp(400, 'No puedes cambiar tu propio rol.');
  const { changes } = await db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(rol, id);
  if (!changes) throw new ErrorHttp(404, 'Usuario no encontrado.');
  res.json({ ok: true });
});

/** POST /api/admin/usuarios/:id/recuperacion — código para que la persona cree una contraseña nueva */
r.post('/usuarios/:id/recuperacion', async (req, res) => {
  const id = idParam(req.params.id);
  if (id === req.usuario.id) throw new ErrorHttp(400, 'Para cambiar tu propia contraseña usa Mi panel.');
  const u = await db.prepare('SELECT nombre, correo FROM usuarios WHERE id = ?').get(id);
  if (!u) throw new ErrorHttp(404, 'Usuario no encontrado.');
  res.status(201).json({ ...u, ...await crearCodigoRecuperacion(id, req.usuario.id) });
});

/* =================== Tablero de impacto =================== */
r.get('/impacto', async (_req, res) => res.json(await calcularImpacto()));

r.get('/impacto.csv', async (_req, res) => {
  const fecha = new Date().toISOString().slice(0, 10);
  res.attachment(`impacto-quibdo-conecta-${fecha}.csv`).type('text/csv; charset=utf-8').send('﻿' + impactoCsv(await calcularImpacto()));
});

/* =================== Copias de seguridad =================== */
r.get('/copias', async (_req, res) => res.json(await listarCopias()));

r.post('/copias', async (_req, res) => res.status(201).json(await crearCopia(true)));

/** Descarga de una copia: contiene datos personales, por eso solo la ven los admins. */
r.get('/copias/:nombre', async (req, res) => {
  const datos = await leerCopia(req.params.nombre);
  if (!datos) throw new ErrorHttp(404, 'Copia no encontrada.');
  res.attachment(req.params.nombre).type('application/json').send(datos);
});

export default r;
