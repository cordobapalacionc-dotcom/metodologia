import { Router } from 'express';
import { db } from '../db.js';
import { requiereSesion, requiereAdmin } from '../autenticacion.js';
import { ErrorHttp, texto, limitador } from '../utilidades.js';
// Mismo análisis que usa el navegador cuando no hay conexión
import { analizar as analizarBase } from '../../../frontend/js/analisis.js';

const r = Router();

/* Opciones válidas del formulario */
export const OPCIONES = {
  edad: ['Menos de 18', '18 a 28', '29 a 45', '46 a 60', 'Más de 60'],
  dispositivos: ['Celular', 'Computador', 'Tableta', 'Ninguno'],
  internet: ['Hogar', 'Datos', 'Público', 'No tengo'],
  calidad: ['Buena', 'Regular, a veces se cae', 'Mala, casi no funciona', 'No tengo conexión'],
  frecuencia: ['Todos los días', 'Algunos días a la semana', 'Rara vez', 'Nunca'],
  dificultades: ['Costo de datos/Internet', 'Mala señal', 'No tengo equipo', 'No sé usar programas',
                 'Miedo a estafas', 'Falta de tiempo', 'Cortes de energía'],
};

/** Análisis usando los títulos actuales de los cursos en la base de datos. */
export async function analizar(d) {
  const cursos = Object.fromEntries((await db.prepare('SELECT id, titulo, icono FROM cursos').all()).map(c => [c.id, c]));
  return analizarBase(d, cursos);
}

export const desdeFila = f => ({ ...f, dispositivos: JSON.parse(f.dispositivos), dificultades: JSON.parse(f.dificultades) });
const aFechaSql = f => f.toISOString().replace('T', ' ').slice(0, 19);

/**
 * POST /api/diagnosticos — se puede responder con o sin cuenta.
 *   paraOtraPersona: true  → "modo jornada": se guarda anónimo, no en la cuenta de quien registra.
 *   fechaLocal: ISO        → fecha real en que se respondió (diagnósticos guardados sin conexión).
 * El límite es alto porque en jornadas de campo se sincronizan muchos a la vez.
 */
r.post('/', limitador({ ventanaMin: 60, max: 300 }), async (req, res) => {
  const b = req.body ?? {};
  const lista = (v, validas) => (Array.isArray(v) ? [...new Set(v)].filter(x => validas.includes(x)) : []);
  const d = {
    edad: b.edad, internet: b.internet, calidad: b.calidad, frecuencia: b.frecuencia,
    nivel: Number(b.nivel),
    dispositivos: lista(b.dispositivos, OPCIONES.dispositivos),
    dificultades: lista(b.dificultades, OPCIONES.dificultades),
    barrio: texto(b.barrio, 80) || null,
  };
  for (const campo of ['edad', 'internet', 'calidad', 'frecuencia'])
    if (!OPCIONES[campo].includes(d[campo])) throw new ErrorHttp(400, 'Responde todas las preguntas del formulario.');
  if (!d.dispositivos.length) throw new ErrorHttp(400, 'Marca al menos una opción de dispositivo (o "Ninguno").');
  if (![1, 2, 3, 4].includes(d.nivel)) throw new ErrorHttp(400, 'Nivel de conocimiento no válido.');

  // Fecha: la del dispositivo si es razonable (no futura, no más de 90 días atrás)
  let fecha = new Date();
  if (typeof b.fechaLocal === 'string') {
    const f = new Date(b.fechaLocal);
    if (!isNaN(f) && f <= Date.now() + 5 * 60_000 && f >= Date.now() - 90 * 86_400_000) fecha = f;
  }
  const propio = req.usuario && b.paraOtraPersona !== true;

  await db.prepare(`
    INSERT INTO diagnosticos (usuario_id, fecha, perfil, edad, dispositivos, internet, calidad, frecuencia, nivel, dificultades, barrio)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      propio ? req.usuario.id : null, aFechaSql(fecha), propio ? req.usuario.perfil : null, d.edad,
      JSON.stringify(d.dispositivos), d.internet, d.calidad, d.frecuencia, d.nivel, JSON.stringify(d.dificultades), d.barrio);
  res.status(201).json({ diagnostico: d, resultado: await analizar(d) });
});

/** GET /api/diagnosticos/mio — último diagnóstico del usuario */
r.get('/mio', requiereSesion, async (req, res) => {
  const fila = await db.prepare('SELECT * FROM diagnosticos WHERE usuario_id = ? ORDER BY id DESC LIMIT 1').get(req.usuario.id);
  if (!fila) return res.json({ diagnostico: null });
  const d = desdeFila(fila);
  res.json({ diagnostico: d, resultado: await analizar(d) });
});

/** GET /api/diagnosticos/estadisticas — datos agregados (anónimos) de la comunidad */
r.get('/estadisticas', async (_req, res) => {
  const filas = (await db.prepare('SELECT * FROM diagnosticos').all()).map(desdeFila);
  const total = filas.length;
  if (!total) return res.json({ total: 0 });
  const pct = n => Math.round(n / total * 100);
  const contar = fn => {
    const m = {};
    filas.forEach(f => [].concat(fn(f)).forEach(v => { if (v) m[v] = (m[v] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([nombre, n]) => ({ nombre, porcentaje: pct(n) }));
  };
  res.json({
    total,
    sinInternet: pct(filas.filter(f => f.internet === 'No tengo' || f.calidad === 'No tengo conexión').length),
    sinComputador: pct(filas.filter(f => !f.dispositivos.includes('Computador')).length),
    nivelPromedio: +(filas.reduce((s, f) => s + f.nivel, 0) / total).toFixed(1),
    dificultades: contar(f => f.dificultades).slice(0, 5),
    conexion: contar(f => f.internet),
    barrios: contar(f => f.barrio).slice(0, 5),
  });
});

/** GET /api/diagnosticos/exportar — CSV completo (solo administradores) */
r.get('/exportar', requiereSesion, requiereAdmin, async (_req, res) => {
  const filas = (await db.prepare('SELECT * FROM diagnosticos ORDER BY id').all()).map(desdeFila);
  const cab = ['id', 'fecha', 'perfil', 'edad', 'dispositivos', 'internet', 'calidad', 'frecuencia', 'nivel', 'dificultades', 'barrio'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cab.join(','), ...filas.map(f =>
    [f.id, f.fecha, f.perfil, f.edad, f.dispositivos.join('; '), f.internet, f.calidad, f.frecuencia, f.nivel, f.dificultades.join('; '), f.barrio]
      .map(q).join(','))].join('\n');
  res.attachment('diagnosticos_quibdo_conecta.csv');
  res.type('text/csv; charset=utf-8').send('﻿' + csv);
});

export default r;
