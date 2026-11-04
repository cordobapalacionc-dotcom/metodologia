import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PUERTO = Number(process.env.PORT || 3000);
export const RUTA_DB = process.env.RUTA_DB || path.join(raiz, 'datos', 'quibdo.db');
export const CARPETA_FRONTEND = path.resolve(raiz, '..', 'frontend');
export const PRODUCCION = process.env.NODE_ENV === 'production';

/** Días que dura una sesión con "mantener sesión iniciada". */
export const DIAS_SESION_LARGA = 30;
/** Días que dura una sesión normal. */
export const DIAS_SESION_CORTA = 1;
