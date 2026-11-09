/**
 * Pasa los datos de la base SQLite de la versión anterior (backend/datos/quibdo.db)
 * a la base PostgreSQL de DATABASE_URL (Supabase): usuarios, contraseñas, avance,
 * certificados, diagnósticos, puntos, cursos… Las sesiones no se pasan (hay que volver a entrar).
 *
 * Uso:  npm run migrar                       → usa backend/datos/quibdo.db
 *       npm run migrar -- ruta/quibdo.db     → otra ubicación
 *       npm run migrar -- ruta/quibdo.db --reemplazar   → aunque Postgres ya tenga usuarios
 */
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { RUTA_DB } from '../src/config.js';
import { pool, prepararBaseDeDatos, db } from '../src/db.js';
import { TABLAS, importarDatos, crearCopia } from '../src/copias.js';

const args = process.argv.slice(2);
const reemplazar = args.includes('--reemplazar');
const ruta = args.find(a => !a.startsWith('--')) || RUTA_DB;

try {
  if (!fs.existsSync(ruta)) throw new Error(`No se encontró la base SQLite en ${ruta}`);
  await prepararBaseDeDatos();

  const usuarios = (await db.prepare('SELECT COUNT(*) AS n FROM usuarios').get()).n;
  if (usuarios && !reemplazar)
    throw new Error(`La base PostgreSQL ya tiene ${usuarios} usuario(s). Si quieres reemplazar TODO por los datos ` +
                    'de SQLite, vuelve a ejecutar el comando agregando --reemplazar al final.');

  const sqlite = new DatabaseSync(ruta, { readOnly: true });
  const existentes = new Set(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(t => t.name));
  const tablas = {};
  for (const t of TABLAS) tablas[t] = existentes.has(t) ? sqlite.prepare(`SELECT * FROM ${t}`).all() : [];
  sqlite.close();

  if (usuarios) console.log(`Estado actual guardado como ${(await crearCopia(true)).nombre}`);
  await importarDatos({ version: 1, fecha: new Date().toISOString(), tablas });
  console.log('Listo. Datos pasados a PostgreSQL:');
  for (const t of TABLAS) if (tablas[t].length) console.log(`  ${t.padEnd(15)} ${tablas[t].length}`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
