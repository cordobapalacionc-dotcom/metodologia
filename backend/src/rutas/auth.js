import { Router } from 'express';
import { db } from '../db.js';
import {
  cifrarClave, verificarClave, crearSesion, cerrarSesion, requiereSesion,
  usarCodigoRecuperacion, cerrarTodasLasSesiones,
} from '../autenticacion.js';
import { ErrorHttp, texto, correoValido, limitador, normalizarCodigo } from '../utilidades.js';
import { ADMIN_CORREOS } from '../config.js';

const r = Router();
export const PERFILES = ['Estudiante', 'Adulto', 'Docente', 'Emprendedor', 'Adulto mayor'];
const limiteAcceso = limitador({ ventanaMin: 15, max: 20 });

// Hash ficticio para que un correo inexistente tarde lo mismo que uno real
const HASH_FICTICIO = await cifrarClave('clave-ficticia-para-igualar-tiempos');

const publico = u => ({ id: u.id, nombre: u.nombre, correo: u.correo, perfil: u.perfil, barrio: u.barrio, rol: u.rol });

/** POST /api/auth/registro */
r.post('/registro', limiteAcceso, async (req, res) => {
  const b = req.body ?? {};
  const nombre = texto(b.nombre, 80);
  const correo = texto(b.correo, 120).toLowerCase();
  const perfil = texto(b.perfil, 30);
  const barrio = texto(b.barrio, 80) || null;
  const clave = typeof b.clave === 'string' ? b.clave : '';

  if (nombre.length < 3) throw new ErrorHttp(400, 'Escribe tu nombre completo.');
  if (!correoValido(correo)) throw new ErrorHttp(400, 'El correo electrónico no es válido.');
  if (!PERFILES.includes(perfil)) throw new ErrorHttp(400, 'Selecciona un perfil válido.');
  if (clave.length < 6 || clave.length > 128) throw new ErrorHttp(400, 'La contraseña debe tener entre 6 y 128 caracteres.');
  if (b.aceptaDatos !== true) throw new ErrorHttp(400, 'Debes aceptar el tratamiento de datos.');
  if (db.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo))
    throw new ErrorHttp(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');

  const hash = await cifrarClave(clave);
  const rol = ADMIN_CORREOS.includes(correo) ? 'admin' : 'usuario';
  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nombre, correo, perfil, barrio, clave_hash, rol) VALUES (?,?,?,?,?,?)')
    .run(nombre, correo, perfil, barrio, hash, rol);
  const id = Number(lastInsertRowid);
  crearSesion(res, id, true);
  res.status(201).json({ usuario: publico({ id, nombre, correo, perfil, barrio, rol }) });
});

/** POST /api/auth/login */
r.post('/login', limiteAcceso, async (req, res) => {
  const correo = texto(req.body?.correo, 120).toLowerCase();
  const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
  if (!correo || !clave) throw new ErrorHttp(400, 'Escribe tu correo y contraseña.');

  const u = db.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo);
  const ok = await verificarClave(clave, u?.clave_hash ?? HASH_FICTICIO);
  if (!u || !ok) throw new ErrorHttp(401, 'Correo o contraseña incorrectos.');

  crearSesion(res, u.id, req.body.recordar !== false);
  res.json({ usuario: publico(u) });
});

/**
 * POST /api/auth/recuperar { correo, codigo, clave }
 * Restablece la contraseña con el código que entregó un admin o el facilitador.
 * Cierra todas las sesiones abiertas de esa cuenta e inicia una nueva.
 */
r.post('/recuperar', limitador({ ventanaMin: 15, max: 10 }), async (req, res) => {
  const correo = texto(req.body?.correo, 120).toLowerCase();
  const codigo = normalizarCodigo(req.body?.codigo);
  const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';
  if (!correo || codigo.length !== 8) throw new ErrorHttp(400, 'Escribe tu correo y el código de 8 caracteres que te entregaron.');
  if (clave.length < 6 || clave.length > 128) throw new ErrorHttp(400, 'La nueva contraseña debe tener entre 6 y 128 caracteres.');

  const u = db.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo);
  // Mismo mensaje si el correo no existe: no se revela qué cuentas hay
  if (!u || !usarCodigoRecuperacion(u.id, codigo))
    throw new ErrorHttp(400, 'El código no es válido o ya venció. Pide uno nuevo a tu facilitador o al administrador.');

  db.prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?').run(await cifrarClave(clave), u.id);
  cerrarTodasLasSesiones(u.id);
  crearSesion(res, u.id, false);
  res.json({ usuario: publico(u) });
});

/** POST /api/auth/logout */
r.post('/logout', (req, res) => {
  cerrarSesion(req, res);
  res.json({ ok: true });
});

/** GET /api/auth/yo — usuario de la sesión actual */
r.get('/yo', requiereSesion, (req, res) => res.json({ usuario: req.usuario }));

export default r;
