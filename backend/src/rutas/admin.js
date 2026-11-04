/**
 * API del panel de administración. Todas las rutas exigen rol "admin".
 */
import { Router } from 'express';
import { db, transaccion } from '../db.js';
import { requiereSesion, requiereAdmin } from '../autenticacion.js';
import { ErrorHttp, texto, idParam, coordenadas, textoAHtml, htmlATexto } from '../utilidades.js';
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
const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Todos'];
const ICONOS = ['monitor', 'documento', 'tabla', 'correo', 'escudo', 'libro', 'wifi', 'bombillo', 'maletin', 'grafica'];
const COLORES = ['', 'rio', 'oro', 'tierra'];

r.get('/cursos', (_req, res) => {
  const cursos = db.prepare('SELECT * FROM cursos ORDER BY orden').all();
  const lecciones = db.prepare('SELECT * FROM lecciones ORDER BY curso_id, orden').all();
  res.json(cursos.map(c => ({
    ...c,
    lecciones: lecciones.filter(l => l.curso_id === c.id).map(l => ({
      id: l.id, orden: l.orden, titulo: l.titulo, pregunta: l.pregunta,
      opciones: JSON.parse(l.opciones), respuesta: l.respuesta,
      texto: l.fuente ?? htmlATexto(l.contenido),
    })),
  })));
});

function datosCurso(b) {
  const c = {
    titulo: texto(b.titulo, 80), nivel: b.nivel, publico: texto(b.publico, 120),
    icono: ICONOS.includes(b.icono) ? b.icono : 'libro',
    color: COLORES.includes(b.color) ? b.color : '',
  };
  if (c.titulo.length < 3) throw new ErrorHttp(400, 'El título del curso es muy corto.');
  if (!NIVELES.includes(c.nivel)) throw new ErrorHttp(400, 'Nivel no válido.');
  return c;
}

const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'curso';

r.post('/cursos', (req, res) => {
  const c = datosCurso(req.body ?? {});
  let id = slug(c.titulo), n = 2;
  while (db.prepare('SELECT 1 FROM cursos WHERE id = ?').get(id)) id = `${slug(c.titulo)}-${n++}`;
  const orden = db.prepare('SELECT COALESCE(MAX(orden), -1) + 1 AS o FROM cursos').get().o;
  db.prepare('INSERT INTO cursos (id, titulo, icono, color, nivel, publico, orden) VALUES (?,?,?,?,?,?,?)')
    .run(id, c.titulo, c.icono, c.color, c.nivel, c.publico, orden);
  res.status(201).json({ id });
});

r.put('/cursos/:id', (req, res) => {
  const c = datosCurso(req.body ?? {});
  const { changes } = db.prepare('UPDATE cursos SET titulo=?, icono=?, color=?, nivel=?, publico=? WHERE id=?')
    .run(c.titulo, c.icono, c.color, c.nivel, c.publico, req.params.id);
  if (!changes) throw new ErrorHttp(404, 'Curso no encontrado.');
  res.json({ ok: true });
});

r.delete('/cursos/:id', (req, res) => {
  db.prepare('DELETE FROM cursos WHERE id = ?').run(req.params.id); // borra sus lecciones y avance (cascada)
  res.json({ ok: true });
});

function datosLeccion(b) {
  const l = {
    titulo: texto(b.titulo, 120),
    texto: typeof b.texto === 'string' ? b.texto.trim().slice(0, 5000) : '',
    pregunta: texto(b.pregunta, 300),
    opciones: Array.isArray(b.opciones) ? b.opciones.map(o => texto(o, 150)).filter(Boolean) : [],
    respuesta: Number(b.respuesta),
  };
  if (l.titulo.length < 3) throw new ErrorHttp(400, 'El título de la lección es muy corto.');
  if (l.texto.length < 10) throw new ErrorHttp(400, 'Escribe el contenido de la lección.');
  if (l.pregunta.length < 5) throw new ErrorHttp(400, 'Escribe la pregunta de comprobación.');
  if (l.opciones.length < 2 || l.opciones.length > 5) throw new ErrorHttp(400, 'La pregunta debe tener entre 2 y 5 opciones.');
  if (!Number.isInteger(l.respuesta) || l.respuesta < 0 || l.respuesta >= l.opciones.length)
    throw new ErrorHttp(400, 'Marca cuál opción es la correcta.');
  return l;
}

r.post('/cursos/:id/lecciones', (req, res) => {
  const curso = db.prepare('SELECT id FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado.');
  const l = datosLeccion(req.body ?? {});
  const orden = db.prepare('SELECT COALESCE(MAX(orden), -1) + 1 AS o FROM lecciones WHERE curso_id = ?').get(curso.id).o;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO lecciones (curso_id, orden, titulo, contenido, fuente, pregunta, opciones, respuesta) VALUES (?,?,?,?,?,?,?,?)`)
    .run(curso.id, orden, l.titulo, textoAHtml(l.texto), l.texto, l.pregunta, JSON.stringify(l.opciones), l.respuesta);
  res.status(201).json({ id: Number(lastInsertRowid) });
});

r.put('/lecciones/:id', (req, res) => {
  const l = datosLeccion(req.body ?? {});
  const { changes } = db.prepare(`
    UPDATE lecciones SET titulo=?, contenido=?, fuente=?, pregunta=?, opciones=?, respuesta=? WHERE id=?`)
    .run(l.titulo, textoAHtml(l.texto), l.texto, l.pregunta, JSON.stringify(l.opciones), l.respuesta, idParam(req.params.id));
  if (!changes) throw new ErrorHttp(404, 'Lección no encontrada.');
  res.json({ ok: true });
});

r.delete('/lecciones/:id', (req, res) => {
  const id = idParam(req.params.id);
  transaccion(() => {
    const l = db.prepare('SELECT curso_id, orden FROM lecciones WHERE id = ?').get(id);
    if (!l) return;
    db.prepare('DELETE FROM lecciones WHERE id = ?').run(id);
    // Reordenar las siguientes para no dejar huecos
    const siguientes = db.prepare('SELECT id FROM lecciones WHERE curso_id = ? AND orden > ? ORDER BY orden').all(l.curso_id, l.orden);
    const mover = db.prepare('UPDATE lecciones SET orden = ? WHERE id = ?');
    siguientes.forEach((s, i) => mover.run(l.orden + i, s.id));
  });
  res.json({ ok: true });
});

/* =================== Usuarios =================== */
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
  if (!['usuario', 'admin'].includes(rol)) throw new ErrorHttp(400, 'Rol no válido.');
  if (id === req.usuario.id) throw new ErrorHttp(400, 'No puedes cambiar tu propio rol.');
  const { changes } = db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(rol, id);
  if (!changes) throw new ErrorHttp(404, 'Usuario no encontrado.');
  res.json({ ok: true });
});

export default r;
