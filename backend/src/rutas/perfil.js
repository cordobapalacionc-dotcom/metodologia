/**
 * Panel personal del usuario: su actividad, datos y contraseña.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion, verificarClave, cifrarClave, cerrarOtrasSesiones } from '../autenticacion.js';
import { ErrorHttp, texto, limitador } from '../utilidades.js';
import { PERFILES } from './auth.js';
import { analizar, desdeFila } from './diagnosticos.js';
import { VISIBLE } from '../servicioCursos.js';

const r = Router();
r.use(requiereSesion);

/** GET /api/perfil — todo lo que ha hecho el usuario */
r.get('/', (req, res) => {
  const id = req.usuario.id;
  const uno = (sql, ...p) => db.prepare(sql).get(...p);
  const todos = (sql, ...p) => db.prepare(sql).all(...p);

  const datos = uno('SELECT nombre, correo, perfil, barrio, rol, creado FROM usuarios WHERE id = ?', id);

  const cursos = todos(`
    SELECT c.id, c.titulo, c.icono, c.color,
      (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total,
      (SELECT COUNT(*) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
        WHERE l.curso_id = c.id AND p.usuario_id = ?) AS completadas,
      (SELECT MAX(p.fecha) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
        WHERE l.curso_id = c.id AND p.usuario_id = ?) AS ultima,
      (SELECT codigo FROM certificados ce WHERE ce.curso_id = c.id AND ce.usuario_id = ?) AS certificado
    FROM cursos c WHERE ${VISIBLE('c')} ORDER BY c.orden`, id, id, id, id, id);

  const certificados = todos(
    'SELECT codigo, curso_titulo, fecha FROM certificados WHERE usuario_id = ? ORDER BY fecha DESC', id);

  // Historial de diagnósticos (del más antiguo al más reciente, para ver la evolución)
  const diagnosticos = todos('SELECT * FROM diagnosticos WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 12', id)
    .map(desdeFila).reverse()
    .map(d => {
      const a = analizar(d);
      return { fecha: d.fecha, perfil: a.perfil, acceso: a.acceso, habilidades: a.habilidades };
    });

  const guardadas = todos(`
    SELECT o.id, o.titulo, o.tipo, o.entidad, o.url FROM guardadas g
    JOIN oportunidades o ON o.id = g.oportunidad_id WHERE g.usuario_id = ? ORDER BY o.titulo`, id);

  const descargas = todos(`
    SELECT r.id, r.titulo, r.tema, r.icono, r.extension, d.fecha FROM descargas d
    JOIN recursos r ON r.id = d.recurso_id WHERE d.usuario_id = ? ORDER BY d.fecha DESC`, id);

  const reportes = todos(
    'SELECT id, nombre, tipo, verificado, creado FROM puntos WHERE reportado_por = ? ORDER BY creado DESC', id)
    .map(p => ({ ...p, verificado: !!p.verificado }));

  const actividad = todos(`
    SELECT 'leccion' AS tipo, l.titulo AS titulo, c.titulo AS detalle, p.fecha AS fecha
      FROM progreso p JOIN lecciones l ON l.id = p.leccion_id JOIN cursos c ON c.id = l.curso_id
      WHERE p.usuario_id = ?
    UNION ALL SELECT 'certificado', curso_titulo, codigo, fecha FROM certificados WHERE usuario_id = ?
    UNION ALL SELECT 'descarga', r.titulo, r.tema, d.fecha
      FROM descargas d JOIN recursos r ON r.id = d.recurso_id WHERE d.usuario_id = ?
    UNION ALL SELECT 'diagnostico', 'Diagnóstico digital', barrio, fecha FROM diagnosticos WHERE usuario_id = ?
    UNION ALL SELECT 'reporte', nombre, tipo, creado FROM puntos WHERE reportado_por = ?
    ORDER BY fecha DESC LIMIT 20`, id, id, id, id, id);

  const lecciones = cursos.reduce((s, c) => s + c.completadas, 0);
  res.json({
    usuario: datos,
    resumen: {
      lecciones,
      leccionesTotal: cursos.reduce((s, c) => s + c.total, 0),
      cursosTerminados: cursos.filter(c => c.total && c.completadas === c.total).length,
      certificados: certificados.length,
      diasEstudio: uno('SELECT COUNT(DISTINCT date(fecha)) AS n FROM progreso WHERE usuario_id = ?', id).n,
      diagnosticos: uno('SELECT COUNT(*) AS n FROM diagnosticos WHERE usuario_id = ?', id).n,
      reportes: reportes.length,
      guardadas: guardadas.length,
    },
    cursos, certificados, diagnosticos, guardadas, descargas, reportes, actividad,
  });
});

/** PUT /api/perfil — editar nombre, perfil y barrio */
r.put('/', (req, res) => {
  const nombre = texto(req.body?.nombre, 80);
  const perfil = texto(req.body?.perfil, 30);
  const barrio = texto(req.body?.barrio, 80) || null;
  if (nombre.length < 3) throw new ErrorHttp(400, 'Escribe tu nombre completo.');
  if (!PERFILES.includes(perfil)) throw new ErrorHttp(400, 'Selecciona un perfil válido.');
  db.prepare('UPDATE usuarios SET nombre = ?, perfil = ?, barrio = ? WHERE id = ?').run(nombre, perfil, barrio, req.usuario.id);
  res.json({ usuario: { ...req.usuario, nombre, perfil, barrio } });
});

/** PUT /api/perfil/clave — cambiar contraseña (cierra las demás sesiones) */
r.put('/clave', limitador({ ventanaMin: 15, max: 10 }), async (req, res) => {
  const actual = typeof req.body?.actual === 'string' ? req.body.actual : '';
  const nueva = typeof req.body?.nueva === 'string' ? req.body.nueva : '';
  const { clave_hash } = db.prepare('SELECT clave_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!(await verificarClave(actual, clave_hash))) throw new ErrorHttp(400, 'La contraseña actual no es correcta.');
  if (nueva.length < 6 || nueva.length > 128) throw new ErrorHttp(400, 'La nueva contraseña debe tener entre 6 y 128 caracteres.');
  if (nueva === actual) throw new ErrorHttp(400, 'La nueva contraseña debe ser diferente a la actual.');
  db.prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?').run(await cifrarClave(nueva), req.usuario.id);
  cerrarOtrasSesiones(req);
  res.json({ ok: true });
});

export default r;
