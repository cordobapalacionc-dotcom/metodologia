/**
 * Restaura una copia de seguridad.
 * Uso:  npm run restaurar                        → lista las copias guardadas en la base de datos
 *       npm run restaurar -- <nombre>            → restaura esa copia
 *       npm run restaurar -- ruta/archivo.json   → restaura una copia descargada
 *
 * IMPORTANTE: reemplaza TODOS los datos. Antes se guarda una copia "-manual" del estado
 * actual, así que la restauración se puede deshacer. Todas las sesiones se cierran.
 */
import fs from 'node:fs';
import { pool, prepararBaseDeDatos } from '../src/db.js';
import { listarCopias, crearCopia, leerCopia, importarDatos } from '../src/copias.js';

const arg = (process.argv[2] || '').trim();
await prepararBaseDeDatos();

try {
  if (!arg) {
    const copias = await listarCopias();
    console.log(copias.length
      ? `Copias disponibles (la más reciente primero):\n  ${copias.map(c => c.nombre).join('\n  ')}\n\n` +
        'Uso: npm run restaurar -- <nombre o archivo.json>'
      : 'No hay copias guardadas en la base de datos.');
  } else {
    const texto = fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : await leerCopia(arg);
    if (!texto) throw new Error(`No existe la copia ni el archivo "${arg}". Ejecuta "npm run restaurar" para ver la lista.`);
    const copia = JSON.parse(texto);
    const respaldo = await crearCopia(true);
    console.log(`Estado actual guardado como ${respaldo.nombre}`);
    await importarDatos(copia);
    console.log(`Listo: se restauró ${arg}.`);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
