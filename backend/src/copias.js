/**
 * Copias de seguridad de la base de datos.
 *
 * - Automáticas: al arrancar y cada hora se revisa si la última copia tiene más de
 *   HORAS_ENTRE_COPIAS; si es así, se hace una nueva.
 * - Manuales: desde el panel de administración o con `npm run copia`.
 * - Se guardan como máximo COPIAS_MAX archivos; los más antiguos se borran.
 *
 * Se usa "VACUUM INTO", que crea una copia consistente aunque el servidor esté en uso.
 * Para restaurar una copia: detener el servidor y ejecutar `npm run restaurar -- <archivo>`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { db } from './db.js';
import { CARPETA_COPIAS, COPIAS_MAX, HORAS_ENTRE_COPIAS, PATRON_COPIA } from './config.js';

export { PATRON_COPIA };


const sello = (f = new Date()) => f.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

export function listarCopias() {
  if (!fs.existsSync(CARPETA_COPIAS)) return [];
  return fs.readdirSync(CARPETA_COPIAS)
    .filter(n => PATRON_COPIA.test(n))
    .map(nombre => {
      const st = fs.statSync(path.join(CARPETA_COPIAS, nombre));
      return { nombre, bytes: st.size, fecha: st.mtime.toISOString(), manual: nombre.includes('-manual') };
    })
    .sort((a, b) => b.nombre.localeCompare(a.nombre));
}

/** Crea una copia y borra las sobrantes. Devuelve los datos de la copia creada. */
export function crearCopia(manual = false) {
  fs.mkdirSync(CARPETA_COPIAS, { recursive: true });
  let fecha = new Date(), nombre;
  // Dos copias en el mismo segundo: se corre el sello un segundo
  do {
    nombre = `quibdo-${sello(fecha)}${manual ? '-manual' : ''}.db`;
    fecha = new Date(fecha.getTime() + 1000);
  } while (fs.existsSync(path.join(CARPETA_COPIAS, nombre)));
  db.prepare('VACUUM INTO ?').run(path.join(CARPETA_COPIAS, nombre));
  for (const vieja of listarCopias().slice(COPIAS_MAX)) fs.rmSync(path.join(CARPETA_COPIAS, vieja.nombre), { force: true });
  return listarCopias().find(c => c.nombre === nombre);
}

/** Ruta completa de una copia, o null si el nombre no es válido o no existe. */
export function rutaCopia(nombre) {
  if (!PATRON_COPIA.test(nombre)) return null;
  const ruta = path.join(CARPETA_COPIAS, nombre);
  return fs.existsSync(ruta) ? ruta : null;
}

function revisar() {
  try {
    const ultima = listarCopias()[0];
    if (!ultima || Date.now() - new Date(ultima.fecha) >= HORAS_ENTRE_COPIAS * 3_600_000) {
      const c = crearCopia(false);
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
