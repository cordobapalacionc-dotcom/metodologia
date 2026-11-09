/**
 * Copias de seguridad de la base de datos (PostgreSQL / Supabase).
 *
 * Cada copia es una fotografía en JSON de todas las tablas, guardada en la tabla "copias".
 * - Automáticas: al arrancar y cada hora se revisa si la última copia tiene más de
 *   HORAS_ENTRE_COPIAS; si es así, se hace una nueva.
 * - Manuales: desde el panel de administración o con `npm run copia`.
 * - Se guardan como máximo COPIAS_MAX; las más antiguas se borran.
 *
 * Las copias viven en la misma base de datos: sirven para deshacer errores (algo borrado
 * por equivocación). Para protegerse de perder el proyecto de Supabase, descarga de vez
 * en cuando una copia desde el panel y guárdala en otro lugar.
 *
 * Para restaurar: `npm run restaurar -- <nombre de la copia o archivo .json>`.
 */
import { db, transaccion } from './db.js';
import { COPIAS_MAX, HORAS_ENTRE_COPIAS, PATRON_COPIA } from './config.js';

export { PATRON_COPIA };

/** Tablas en un orden que respeta las llaves foráneas (las sesiones no se copian). */
export const TABLAS = [
  'usuarios', 'cursos', 'lecciones', 'progreso', 'puntos', 'recursos', 'descargas',
  'oportunidades', 'guardadas', 'diagnosticos', 'certificados', 'inscripciones', 'recuperaciones',
];

const sello = (f = new Date()) => f.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
/** Las fechas se guardan como 'AAAA-MM-DD HH:MM:SS' en UTC. */
const aIso = f => f.replace(' ', 'T') + 'Z';

/** Todos los datos como objeto { version, fecha, tablas: { nombre: [filas] } }. */
export async function exportarDatos() {
  const tablas = {};
  for (const t of TABLAS) tablas[t] = await db.prepare(`SELECT * FROM ${t}`).all();
  return { version: 1, fecha: new Date().toISOString(), tablas };
}

/**
 * Reemplaza TODOS los datos por los de una copia (objeto devuelto por exportarDatos,
 * o uno con la misma forma creado desde la base SQLite anterior). Todo o nada.
 */
export async function importarDatos(copia) {
  if (!copia?.tablas || typeof copia.tablas !== 'object') throw new Error('El archivo no tiene el formato de una copia.');
  await transaccion(async () => {
    await db.exec(`TRUNCATE ${TABLAS.join(', ')}, sesiones RESTART IDENTITY CASCADE`);
    for (const t of TABLAS) {
      // Solo las columnas que existen en la tabla actual
      const existentes = new Set((await db.prepare(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?").all(t))
        .map(c => c.column_name));
      for (const fila of copia.tablas[t] ?? []) {
        const cols = Object.keys(fila).filter(c => existentes.has(c));
        await db.prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
          .run(...cols.map(c => fila[c]));
      }
      // El contador de id debe seguir después del mayor id importado
      if (existentes.has('id')) {
        const seq = (await db.prepare('SELECT pg_get_serial_sequence(?, ?) AS s').get(t, 'id')).s;
        if (seq) await db.prepare(`SELECT setval(?, COALESCE((SELECT MAX(id) FROM ${t}), 0) + 1, false)`).get(seq);
      }
    }
  });
}

export async function listarCopias() {
  const filas = await db.prepare(
    'SELECT nombre, fecha, manual, octet_length(datos) AS bytes FROM copias ORDER BY nombre DESC').all();
  return filas.map(c => ({ ...c, fecha: aIso(c.fecha) }));
}

/** Crea una copia y borra las sobrantes. Devuelve los datos de la copia creada. */
export async function crearCopia(manual = false) {
  const datos = JSON.stringify(await exportarDatos());
  let fecha = new Date(), nombre;
  // Dos copias en el mismo segundo: se corre el sello un segundo
  do {
    nombre = `quibdo-${sello(fecha)}${manual ? '-manual' : ''}.json`;
    fecha = new Date(fecha.getTime() + 1000);
  } while (await db.prepare('SELECT 1 FROM copias WHERE nombre = ?').get(nombre));
  await db.prepare('INSERT INTO copias (nombre, manual, datos) VALUES (?, ?, ?)').run(nombre, manual, datos);
  await db.prepare('DELETE FROM copias WHERE nombre NOT IN (SELECT nombre FROM copias ORDER BY nombre DESC LIMIT ?)').run(COPIAS_MAX);
  return (await listarCopias()).find(c => c.nombre === nombre);
}

/** Contenido JSON de una copia, o null si el nombre no es válido o no existe. */
export async function leerCopia(nombre) {
  if (!PATRON_COPIA.test(nombre)) return null;
  return (await db.prepare('SELECT datos FROM copias WHERE nombre = ?').get(nombre))?.datos ?? null;
}

async function revisar() {
  try {
    const ultima = (await listarCopias())[0];
    if (!ultima || Date.now() - new Date(ultima.fecha) >= HORAS_ENTRE_COPIAS * 3_600_000) {
      const c = await crearCopia(false);
      console.log(`  Copia de seguridad creada: ${c.nombre}`);
    }
  } catch (e) {
    console.error('  No se pudo crear la copia de seguridad automática:', e.message);
  }
}

/** Activa las copias automáticas (no impide que el proceso termine). */
export function iniciarCopiasAutomaticas() {
  revisar();
  setInterval(revisar, 3_600_000).unref();
}
