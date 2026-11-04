/**
 * Convierte en administrador a un usuario ya registrado.
 * Uso:  npm run admin -- correo@ejemplo.com
 */
import { db } from '../src/db.js';

const correo = (process.argv[2] || '').trim().toLowerCase();
if (!correo) {
  console.error('Uso: npm run admin -- correo@ejemplo.com');
  process.exit(1);
}
const { changes } = db.prepare("UPDATE usuarios SET rol = 'admin' WHERE correo = ?").run(correo);
console.log(changes
  ? `Listo: ${correo} ahora es administrador.`
  : `No existe un usuario con el correo ${correo}. Primero regístralo en la plataforma.`);
