import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';
import { PRODUCCION, DIAS_SESION_LARGA, DIAS_SESION_CORTA } from './config.js';
import { codigoAleatorio } from './utilidades.js';

const scrypt = promisify(crypto.scrypt);
export const COOKIE = 'qc_sesion';

/* ---------- Contraseñas (scrypt + sal aleatoria) ---------- */
export async function cifrarClave(clave) {
  const sal = crypto.randomBytes(16);
  const hash = await scrypt(clave, sal, 64);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

export async function verificarClave(clave, guardada) {
  const [, salHex, hashHex] = guardada.split('$');
  const hash = await scrypt(clave, Buffer.from(salHex, 'hex'), 64);
  const esperado = Buffer.from(hashHex, 'hex');
  return hash.length === esperado.length && crypto.timingSafeEqual(hash, esperado);
}

/* ---------- Sesiones (token aleatorio en cookie HttpOnly; en BD solo su hash) ---------- */
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

export async function crearSesion(res, usuarioId, recordar) {
  const token = crypto.randomBytes(32).toString('base64url');
  const dias = recordar ? DIAS_SESION_LARGA : DIAS_SESION_CORTA;
  const expira = new Date(Date.now() + dias * 86_400_000);
  await db.prepare('INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES (?,?,?)')
    .run(hashToken(token), usuarioId, expira.toISOString());
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: PRODUCCION,
    path: '/',
    ...(recordar ? { expires: expira } : {}), // sin "recordar": cookie de sesión del navegador
  });
}

export async function cerrarSesion(req, res) {
  if (req.token) await db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(hashToken(req.token));
  res.clearCookie(COOKIE, { path: '/' });
}

/** Cierra todas las sesiones del usuario excepto la actual (p. ej. al cambiar la contraseña). */
export async function cerrarOtrasSesiones(req) {
  await db.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token_hash != ?').run(req.usuario.id, hashToken(req.token));
}

function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

const consultaSesion = db.prepare(`
  SELECT u.id, u.nombre, u.correo, u.perfil, u.barrio, u.rol
  FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
  WHERE s.token_hash = ? AND s.expira > ?`);

/** Carga req.usuario si hay una sesión válida (no obliga a iniciar sesión). */
export async function cargarUsuario(req, _res, next) {
  req.usuario = null;
  const token = leerCookie(req, COOKIE);
  if (token) {
    const fila = await consultaSesion.get(hashToken(token), new Date().toISOString());
    if (fila) {
      req.usuario = { ...fila };
      req.token = token;
    }
  }
  next();
}

export const requiereSesion = (req, res, next) =>
  req.usuario ? next() : res.status(401).json({ error: 'Debes iniciar sesión.' });

export const requiereAdmin = (req, res, next) =>
  req.usuario?.rol === 'admin' ? next() : res.status(403).json({ error: 'Solo para administradores.' });

/** Facilitadores y administradores. */
export const requiereFacilitador = (req, res, next) =>
  ['facilitador', 'admin'].includes(req.usuario?.rol)
    ? next() : res.status(403).json({ error: 'Solo para facilitadores.' });

/* ---------- Recuperación de contraseña ----------
 * No hay servidor de correo: un admin o el facilitador de la persona genera un código
 * de un solo uso y se lo entrega en persona o por WhatsApp. En la BD solo queda su hash.
 */
export const HORAS_CODIGO_RECUPERACION = 24;
const MAX_INTENTOS_RECUPERACION = 5;

/** Crea un código nuevo (anula los anteriores) y lo devuelve en claro con el formato ABCD-EFGH. */
export async function crearCodigoRecuperacion(usuarioId, creadoPor) {
  const codigo = codigoAleatorio(8);
  const expira = new Date(Date.now() + HORAS_CODIGO_RECUPERACION * 3_600_000);
  await db.prepare("UPDATE recuperaciones SET usado = datetime('now') WHERE usuario_id = ? AND usado IS NULL").run(usuarioId);
  await db.prepare('INSERT INTO recuperaciones (usuario_id, codigo_hash, creado_por, expira) VALUES (?,?,?,?)')
    .run(usuarioId, hashToken(codigo), creadoPor, expira.toISOString());
  return { codigo: `${codigo.slice(0, 4)}-${codigo.slice(4)}`, expira: expira.toISOString() };
}

/**
 * Comprueba el código vigente de un usuario. Devuelve true si es correcto (y lo marca como usado).
 * Tras varios intentos fallidos el código se anula, para que no se pueda adivinar.
 */
export async function usarCodigoRecuperacion(usuarioId, codigoNormalizado) {
  const fila = await db.prepare(`
    SELECT id, codigo_hash, intentos FROM recuperaciones
    WHERE usuario_id = ? AND usado IS NULL AND expira > ? ORDER BY id DESC LIMIT 1`)
    .get(usuarioId, new Date().toISOString());
  if (!fila) return false;
  const a = Buffer.from(hashToken(codigoNormalizado)), b = Buffer.from(fila.codigo_hash);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    await db.prepare("UPDATE recuperaciones SET usado = datetime('now') WHERE id = ?").run(fila.id);
    return true;
  }
  const intentos = fila.intentos + 1;
  await db.prepare(`UPDATE recuperaciones SET intentos = ?${intentos >= MAX_INTENTOS_RECUPERACION ? ", usado = datetime('now')" : ''} WHERE id = ?`)
    .run(intentos, fila.id);
  return false;
}

/** Cierra todas las sesiones de un usuario (al restablecer su contraseña). */
export const cerrarTodasLasSesiones = async usuarioId => await db.prepare('DELETE FROM sesiones WHERE usuario_id = ?').run(usuarioId);
