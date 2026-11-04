import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';
import { PRODUCCION, DIAS_SESION_LARGA, DIAS_SESION_CORTA } from './config.js';

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

export function crearSesion(res, usuarioId, recordar) {
  const token = crypto.randomBytes(32).toString('base64url');
  const dias = recordar ? DIAS_SESION_LARGA : DIAS_SESION_CORTA;
  const expira = new Date(Date.now() + dias * 86_400_000);
  db.prepare('INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES (?,?,?)')
    .run(hashToken(token), usuarioId, expira.toISOString());
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: PRODUCCION,
    path: '/',
    ...(recordar ? { expires: expira } : {}), // sin "recordar": cookie de sesión del navegador
  });
}

export function cerrarSesion(req, res) {
  if (req.token) db.prepare('DELETE FROM sesiones WHERE token_hash = ?').run(hashToken(req.token));
  res.clearCookie(COOKIE, { path: '/' });
}

/** Cierra todas las sesiones del usuario excepto la actual (p. ej. al cambiar la contraseña). */
export function cerrarOtrasSesiones(req) {
  db.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token_hash != ?').run(req.usuario.id, hashToken(req.token));
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
export function cargarUsuario(req, _res, next) {
  req.usuario = null;
  const token = leerCookie(req, COOKIE);
  if (token) {
    const fila = consultaSesion.get(hashToken(token), new Date().toISOString());
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
