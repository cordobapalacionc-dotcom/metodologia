/**
 * Restaura una copia de seguridad.
 * Uso:  npm run restaurar               → lista las copias disponibles
 *       npm run restaurar -- <archivo>  → restaura esa copia
 *
 * IMPORTANTE: detén el servidor antes de restaurar.
 * Antes de reemplazar la base actual se guarda una copia de ella ("-manual"),
 * así que la restauración se puede deshacer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
// No se importa db.js: este script no debe abrir la base que va a reemplazar
import { RUTA_DB, CARPETA_COPIAS, PUERTO, PATRON_COPIA } from '../src/config.js';

const nombre = (process.argv[2] || '').trim();

const disponibles = fs.existsSync(CARPETA_COPIAS)
  ? fs.readdirSync(CARPETA_COPIAS).filter(n => PATRON_COPIA.test(n)).sort().reverse() : [];

if (!nombre) {
  console.log(disponibles.length
    ? `Copias disponibles (la más reciente primero):\n  ${disponibles.join('\n  ')}\n\nUso: npm run restaurar -- <archivo>`
    : `No hay copias en ${CARPETA_COPIAS}`);
  process.exit(0);
}
if (!disponibles.includes(nombre)) {
  console.error(`No existe la copia "${nombre}". Ejecuta "npm run restaurar" para ver la lista.`);
  process.exit(1);
}

// Comprobar que el servidor esté apagado
try {
  await fetch(`http://localhost:${PUERTO}/api/salud`, { signal: AbortSignal.timeout(1500) });
  console.error(`El servidor está encendido en el puerto ${PUERTO}. Detenlo (Ctrl+C) y vuelve a ejecutar este comando.`);
  process.exit(1);
} catch { /* apagado: se puede continuar */ }

// Comprobar que la copia sea una base de datos válida
const prueba = new DatabaseSync(path.join(CARPETA_COPIAS, nombre), { readOnly: true });
const ok = prueba.prepare('PRAGMA integrity_check').get();
prueba.close();
if (Object.values(ok)[0] !== 'ok') {
  console.error('La copia está dañada; no se restauró nada.');
  process.exit(1);
}

// Guardar la base actual antes de reemplazarla
if (fs.existsSync(RUTA_DB)) {
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const respaldo = path.join(CARPETA_COPIAS, `quibdo-${sello}-manual.db`);
  const actual = new DatabaseSync(RUTA_DB);
  actual.prepare('VACUUM INTO ?').run(respaldo);
  actual.close();
  console.log(`Base actual guardada como ${path.basename(respaldo)}`);
}

for (const extra of ['-wal', '-shm']) fs.rmSync(RUTA_DB + extra, { force: true });
fs.copyFileSync(path.join(CARPETA_COPIAS, nombre), RUTA_DB);
console.log(`Listo: se restauró ${nombre}. Ya puedes encender el servidor con "npm start".`);
