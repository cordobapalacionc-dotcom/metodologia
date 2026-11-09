/**
 * API del facilitador: sus cursos de grupo, sus estudiantes y la recuperación de
 * contraseñas de esos estudiantes. Un facilitador solo puede tocar lo que es suyo.
 * Los administradores también pueden usarla para sus propios grupos.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion, requiereFacilitador, crearCodigoRecuperacion } from '../autenticacion.js';
import { ErrorHttp, idParam } from '../utilidades.js';
import {
  cursosParaEditor, crearCurso, actualizarCurso, borrarCurso, crearLeccion, actualizarLeccion, borrarLeccion,
  nuevoCodigoAcceso,
} from '../servicioCursos.js';

const r = Router();
r.use(requiereSesion, requiereFacilitador);

/** Curso del facilitador o error 404 (no se revela si existe un curso ajeno con ese id). */
async function cursoPropio(req, cursoId) {
  const c = await db.prepare('SELECT * FROM cursos WHERE id = ? AND autor_id = ?').get(cursoId, req.usuario.id);
  if (!c) throw new ErrorHttp(404, 'Curso no encontrado entre tus grupos.');
  return c;
}

async function leccionPropia(req, id) {
  const l = await db.prepare('SELECT curso_id FROM lecciones WHERE id = ?').get(idParam(id));
  if (!l) throw new ErrorHttp(404, 'Lección no encontrada.');
  await cursoPropio(req, l.curso_id);
  return idParam(id);
}

/* =================== Cursos =================== */
r.get('/cursos', async (req, res) => res.json(await cursosParaEditor('c.autor_id = ?', req.usuario.id)));

r.post('/cursos', async (req, res) => {
  const total = (await db.prepare('SELECT COUNT(*) AS n FROM cursos WHERE autor_id = ?').get(req.usuario.id)).n;
  if (total >= 30) throw new ErrorHttp(400, 'Llegaste al máximo de 30 cursos. Elimina alguno que ya no uses.');
  res.status(201).json(await crearCurso(req.body ?? {}, req.usuario.id));
});

r.put('/cursos/:id', async (req, res) => {
  await actualizarCurso((await cursoPropio(req, req.params.id)).id, req.body ?? {});
  res.json({ ok: true });
});

r.delete('/cursos/:id', async (req, res) => {
  await borrarCurso((await cursoPropio(req, req.params.id)).id);
  res.json({ ok: true });
});

/** POST /api/facilitador/cursos/:id/codigo — cambia el código de invitación (el anterior deja de servir) */
r.post('/cursos/:id/codigo', async (req, res) => {
  const c = await cursoPropio(req, req.params.id);
  const codigo = await nuevoCodigoAcceso();
  await db.prepare('UPDATE cursos SET codigo_acceso = ? WHERE id = ?').run(codigo, c.id);
  res.json({ codigo_acceso: codigo });
});

r.post('/cursos/:id/lecciones', async (req, res) => {
  const c = await cursoPropio(req, req.params.id);
  if ((await db.prepare('SELECT COUNT(*) AS n FROM lecciones WHERE curso_id = ?').get(c.id)).n >= 50)
    throw new ErrorHttp(400, 'Un curso puede tener como máximo 50 lecciones.');
  res.status(201).json({ id: await crearLeccion(c.id, req.body ?? {}) });
});

r.put('/lecciones/:id', async (req, res) => {
  await actualizarLeccion(await leccionPropia(req, req.params.id), req.body ?? {});
  res.json({ ok: true });
});

r.delete('/lecciones/:id', async (req, res) => {
  await borrarLeccion(await leccionPropia(req, req.params.id));
  res.json({ ok: true });
});

/* =================== Estudiantes =================== */

/** GET /api/facilitador/cursos/:id/estudiantes — inscritos y su avance */
r.get('/cursos/:id/estudiantes', async (req, res) => {
  const c = await cursoPropio(req, req.params.id);
  const total = (await db.prepare('SELECT COUNT(*) AS n FROM lecciones WHERE curso_id = ?').get(c.id)).n;
  const estudiantes = await db.prepare(`
    SELECT u.id, u.nombre, u.correo, u.perfil, u.barrio, u.rol, i.fecha AS inscrito,
      (SELECT COUNT(*) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
        WHERE l.curso_id = ? AND p.usuario_id = u.id) AS completadas,
      (SELECT MAX(p.fecha) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
        WHERE l.curso_id = ? AND p.usuario_id = u.id) AS ultima,
      (SELECT codigo FROM certificados ce WHERE ce.curso_id = ? AND ce.usuario_id = u.id) AS certificado
    FROM inscripciones i JOIN usuarios u ON u.id = i.usuario_id
    WHERE i.curso_id = ? ORDER BY u.nombre`).all(c.id, c.id, c.id, c.id);
  res.json({ total, estudiantes });
});

/** DELETE /api/facilitador/cursos/:id/estudiantes/:uid — sacar a alguien del grupo (su avance se conserva) */
r.delete('/cursos/:id/estudiantes/:uid', async (req, res) => {
  const c = await cursoPropio(req, req.params.id);
  await db.prepare('DELETE FROM inscripciones WHERE curso_id = ? AND usuario_id = ?').run(c.id, idParam(req.params.uid));
  res.json({ ok: true });
});

/**
 * POST /api/facilitador/estudiantes/:uid/recuperacion
 * Solo para estudiantes de sus grupos con rol "usuario" (no puede tocar cuentas de otros facilitadores ni admins).
 */
r.post('/estudiantes/:uid/recuperacion', async (req, res) => {
  const id = idParam(req.params.uid);
  const u = await db.prepare(`
    SELECT u.nombre, u.correo FROM usuarios u
    WHERE u.id = ? AND u.rol = 'usuario' AND EXISTS (
      SELECT 1 FROM inscripciones i JOIN cursos c ON c.id = i.curso_id
      WHERE i.usuario_id = u.id AND c.autor_id = ?)`).get(id, req.usuario.id);
  if (!u) throw new ErrorHttp(404, 'Solo puedes generar códigos para estudiantes de tus grupos.');
  res.status(201).json({ ...u, ...await crearCodigoRecuperacion(id, req.usuario.id) });
});

export default r;
