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

/** Dirección pública del sitio (p. ej. https://quibdoconecta.co). Se usa en el QR de los certificados.
 *  Si no se define, se toma del navegador que hace la petición. */
export const URL_PUBLICA = (process.env.URL_PUBLICA || '').replace(/\/+$/, '');

/* ---------- Copias de seguridad ---------- */
export const CARPETA_COPIAS = process.env.RUTA_COPIAS || path.join(path.dirname(RUTA_DB), 'copias');
/** Cada cuántas horas se hace una copia automática. */
export const HORAS_ENTRE_COPIAS = Number(process.env.HORAS_ENTRE_COPIAS || 24);
/** Cuántas copias se guardan como máximo (se borran las más antiguas). */
export const COPIAS_MAX = Number(process.env.COPIAS_MAX || 30);
/** Formato del nombre de las copias (evita leer archivos fuera de la carpeta). */
export const PATRON_COPIA = /^quibdo-\d{8}-\d{6}(-manual)?\.db$/;
