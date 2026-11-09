import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PUERTO = Number(process.env.PORT || 3000);
export const RUTA_DB = process.env.RUTA_DB || path.join(raiz, 'datos', 'quibdo.db');
export const CARPETA_FRONTEND = path.resolve(raiz, '..', 'frontend');
export const PRODUCCION = process.env.NODE_ENV === 'production';
/** En Render (o con TRUST_PROXY=1) el servidor está detrás de un proxy: se usa la IP real del visitante. */
export const DETRAS_DE_PROXY = process.env.RENDER === 'true' || process.env.TRUST_PROXY === '1';
/** Correos que se convierten en administradores automáticamente (separados por comas). */
export const ADMIN_CORREOS = (process.env.ADMIN_CORREOS || '')
  .split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

/** Días que dura una sesión con "mantener sesión iniciada". */
export const DIAS_SESION_LARGA = 30;
/** Días que dura una sesión normal. */
export const DIAS_SESION_CORTA = 1;
