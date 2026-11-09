/**
 * Conexión a PostgreSQL (Supabase u otro servidor) mediante DATABASE_URL.
 *
 * Ofrece una interfaz parecida a la de la versión SQLite, pero asíncrona:
 *   await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id)
 *   await db.prepare('SELECT ...').all(...)
 *   const { changes, lastInsertRowid } = await db.prepare('INSERT ...').run(...)
 * Los "?" se convierten en $1, $2… y los INSERT devuelven el id creado.
 *
 * transaccion(async () => { ... }) ejecuta todo lo de adentro en una sola transacción:
 * cualquier consulta hecha dentro (aunque sea desde otra función) usa esa transacción.
 */
import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { DATABASE_URL, ADMIN_CORREOS } from './config.js';
import { sembrar } from './semilla.js';

if (!DATABASE_URL) {
  console.error('\n  Falta la variable DATABASE_URL (cadena de conexión de PostgreSQL / Supabase).\n' +
                '  Ejemplo: DATABASE_URL=postgresql://usuario:clave@servidor:5432/postgres\n');
  process.exit(1);
}

// COUNT(*) y SUM() devuelven bigint/numeric: se convierten a número de JavaScript
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL);
export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false }, // Supabase exige SSL
  max: Number(process.env.PG_CONEXIONES || 5),
});
pool.on('error', e => console.error('  Error en una conexión inactiva de PostgreSQL:', e.message));

const enTransaccion = new AsyncLocalStorage();
const cliente = () => enTransaccion.getStore() ?? pool;

/** Convierte los "?" de estilo SQLite en $1, $2… */
const aPostgres = sql => {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
};

const consultar = (sql, params = []) => cliente().query(aPostgres(sql), params);

export const db = {
  prepare(sql) {
    return {
      get: async (...p) => (await consultar(sql, p)).rows[0],
      all: async (...p) => (await consultar(sql, p)).rows,
      run: async (...p) => {
        // Los INSERT devuelven la fila creada para conocer su id (como lastInsertRowid en SQLite)
        const texto = /^\s*INSERT/i.test(sql) && !/RETURNING/i.test(sql) ? `${sql} RETURNING *` : sql;
        const r = await consultar(texto, p);
        return { changes: r.rowCount, lastInsertRowid: r.rows?.[0]?.id };
      },
    };
  },
  exec: sql => cliente().query(sql),
};

/** Ejecuta fn dentro de una transacción. Si ya hay una abierta, se une a ella. */
export async function transaccion(fn) {
  if (enTransaccion.getStore()) return fn();
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await enTransaccion.run(c, fn);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Crea las tablas (si no existen), limpia sesiones vencidas y carga el contenido inicial. */
export async function prepararBaseDeDatos() {
  await db.exec(fs.readFileSync(new URL('./esquema.sql', import.meta.url), 'utf8'));
  await db.prepare('DELETE FROM sesiones WHERE expira <= ?').run(new Date().toISOString());
  await sembrar(db, transaccion);
  // Administradores definidos por la variable de entorno ADMIN_CORREOS (útil en hosting sin terminal)
  for (const correo of ADMIN_CORREOS)
    await db.prepare("UPDATE usuarios SET rol = 'admin' WHERE correo = ?").run(correo);
}
