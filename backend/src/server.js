import express from 'express';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PUERTO, CARPETA_FRONTEND } from './config.js';
import './db.js';
import { cargarUsuario } from './autenticacion.js';
import { manejadorErrores } from './utilidades.js';
import rutasAuth from './rutas/auth.js';
import rutasCursos from './rutas/cursos.js';
import rutasPuntos from './rutas/puntos.js';
import rutasRecursos from './rutas/recursos.js';
import rutasOportunidades from './rutas/oportunidades.js';
import rutasDiagnosticos from './rutas/diagnosticos.js';
import rutasCertificados from './rutas/certificados.js';
import rutasAdmin from './rutas/admin.js';
import rutasPerfil from './rutas/perfil.js';
import rutasFacilitador from './rutas/facilitador.js';
import { iniciarCopiasAutomaticas } from './copias.js';

const require = createRequire(import.meta.url);
const CARPETA_LEAFLET = path.dirname(require.resolve('leaflet/dist/leaflet.js'));
// Servidor de teselas del mapa (OpenStreetMap)
const TESELAS = 'https://tile.openstreetmap.org';

const app = express();
app.disable('x-powered-by');

// Cabeceras de seguridad básicas
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin', // OpenStreetMap exige conocer el sitio que pide las teselas
    'Content-Security-Policy':
      `default-src 'self'; img-src 'self' data: ${TESELAS}; style-src 'self' 'unsafe-inline'; script-src 'self'; ` +
      `connect-src 'self' ${TESELAS}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  });
  next();
});

app.use(express.json({ limit: '20kb' }));
app.use(cargarUsuario);

/* ---------- API ---------- */
app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rutasAuth);
app.use('/api/cursos', rutasCursos);
app.use('/api/puntos', rutasPuntos);
app.use('/api/recursos', rutasRecursos);
app.use('/api/oportunidades', rutasOportunidades);
app.use('/api/diagnosticos', rutasDiagnosticos);
app.use('/api/certificados', rutasCertificados);
app.use('/api/admin', rutasAdmin);
app.use('/api/perfil', rutasPerfil);
app.use('/api/facilitador', rutasFacilitador);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

/* ---------- Librerías del frontend ---------- */
app.use('/vendor/leaflet', express.static(CARPETA_LEAFLET, { maxAge: '30d' }));

/* ---------- Frontend (páginas estáticas: /aula sirve aula.html) ---------- */
app.use(express.static(CARPETA_FRONTEND, { extensions: ['html'] }));
app.use((_req, res) => res.status(404).type('html').send(
  '<!DOCTYPE html><meta charset="utf-8"><title>No encontrada</title><p>Página no encontrada. <a href="/inicio">Volver al inicio</a></p>'));

app.use(manejadorErrores);

app.listen(PUERTO, () => {
  console.log(`\n  Quibdó Conecta funcionando en  http://localhost:${PUERTO}\n`);
  iniciarCopiasAutomaticas();
});
