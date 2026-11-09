/**
 * Crea una copia de seguridad de la base de datos ahora mismo.
 * Uso:  npm run copia
 * Funciona aunque el servidor esté encendido.
 */
import { crearCopia } from '../src/copias.js';
import { CARPETA_COPIAS } from '../src/config.js';

const c = crearCopia(true);
console.log(`Copia creada: ${c.nombre} (${(c.bytes / 1024).toFixed(0)} KB)\nCarpeta: ${CARPETA_COPIAS}`);
