import { Router } from 'express';
import QRCode from 'qrcode';
import { db } from '../db.js';
import { requiereSesion } from '../autenticacion.js';
import { ErrorHttp, texto, codigoAleatorio } from '../utilidades.js';
import { cursoVisible } from '../servicioCursos.js';
import { URL_PUBLICA } from '../config.js';

const r = Router();

function nuevoCodigo() {
  let c;
  do c = codigoAleatorio(10);
  while (db.prepare('SELECT 1 FROM certificados WHERE codigo = ?').get(`QC-${c.slice(0, 5)}-${c.slice(5)}`));
  return `QC-${c.slice(0, 5)}-${c.slice(5)}`;
}

/** POST /api/certificados { curso } — emite (o devuelve) el certificado de un curso terminado */
r.post('/', requiereSesion, (req, res) => {
  const curso = cursoVisible(req.usuario, texto(req.body?.curso, 60));
  if (!curso) throw new ErrorHttp(404, 'Curso no encontrado.');

  const existente = db.prepare('SELECT codigo FROM certificados WHERE usuario_id = ? AND curso_id = ?').get(req.usuario.id, curso.id);
  if (existente) return res.json({ codigo: existente.codigo });

  const { total, hechas } = db.prepare(`
    SELECT (SELECT COUNT(*) FROM lecciones WHERE curso_id = ?) AS total,
           (SELECT COUNT(*) FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
            WHERE l.curso_id = ? AND p.usuario_id = ?) AS hechas`).get(curso.id, curso.id, req.usuario.id);
  if (!total || hechas < total) throw new ErrorHttp(400, `Te faltan ${total - hechas} lecciones para obtener el certificado.`);

  // En los cursos de grupo queda el nombre de quien lo dictó
  const facilitador = curso.codigo_acceso && curso.autor_id
    ? db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(curso.autor_id)?.nombre ?? null
    : null;

  const codigo = nuevoCodigo();
  db.prepare('INSERT INTO certificados (codigo, usuario_id, curso_id, curso_titulo, lecciones, facilitador) VALUES (?,?,?,?,?,?)')
    .run(codigo, req.usuario.id, curso.id, curso.titulo, total, facilitador);
  res.status(201).json({ codigo });
});

/** GET /api/certificados/mios */
r.get('/mios', requiereSesion, (req, res) => {
  res.json(db.prepare('SELECT codigo, curso_id, curso_titulo, fecha FROM certificados WHERE usuario_id = ? ORDER BY fecha DESC')
    .all(req.usuario.id));
});

const buscar = codigo => db.prepare(`
  SELECT c.codigo, c.curso_titulo, c.lecciones, c.fecha, c.facilitador, u.nombre
  FROM certificados c JOIN usuarios u ON u.id = c.usuario_id WHERE c.codigo = ?`).get(texto(codigo, 20).toUpperCase());

/**
 * GET /api/certificados/:codigo/qr.svg — código QR que abre la página de verificación.
 * Se usa URL_PUBLICA si está configurada; si no, la dirección con la que se abrió el sitio.
 */
r.get('/:codigo/qr.svg', async (req, res) => {
  const c = buscar(req.params.codigo);
  if (!c) throw new ErrorHttp(404, 'No existe un certificado con ese código.');
  const base = URL_PUBLICA || `${req.protocol}://${req.get('host')}`;
  const svg = await QRCode.toString(`${base}/certificado?codigo=${encodeURIComponent(c.codigo)}`, {
    type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f5132', light: '#ffffff' },
  });
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(svg);
});

/** GET /api/certificados/:codigo — verificación pública */
r.get('/:codigo', (req, res) => {
  const c = buscar(req.params.codigo);
  if (!c) throw new ErrorHttp(404, 'No existe un certificado con ese código.');
  res.json(c);
});

export default r;
