/**
 * Crea una copia de seguridad de la base de datos ahora mismo y la guarda también como archivo.
 * Uso:  npm run copia
 * Funciona aunque el servidor esté encendido.
 */
import fs from 'node:fs';
import { pool, prepararBaseDeDatos } from '../src/db.js';
import { crearCopia, leerCopia } from '../src/copias.js';

await prepararBaseDeDatos();
const c = await crearCopia(true);
fs.writeFileSync(c.nombre, await leerCopia(c.nombre));
console.log(`Copia creada: ${c.nombre} (${(c.bytes / 1024).toFixed(0)} KB)\n` +
            `Guardada en la base de datos y en el archivo ./${c.nombre}`);
await pool.end();
