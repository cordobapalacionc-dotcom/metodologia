/** Error con código HTTP que el manejador central convierte en respuesta JSON. */
export class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

/** Devuelve un texto limpio y recortado, o '' si no es texto. */
export const texto = (valor, max = 200) => (typeof valor === 'string' ? valor.trim().slice(0, max) : '');

export const correoValido = c => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

/** Lee un id numérico de la URL o lanza 400. */
export function idParam(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorHttp(400, 'Identificador no válido.');
  return n;
}

/**
 * Limitador de peticiones en memoria (por IP).
 * Suficiente para un prototipo; en producción con varios servidores usar Redis.
 */
export function limitador({ ventanaMin, max, mensaje = 'Demasiados intentos. Espera unos minutos.' }) {
  const registros = new Map();
  return (req, res, next) => {
    const ahora = Date.now();
    const r = registros.get(req.ip);
    if (!r || r.reinicio < ahora) {
      registros.set(req.ip, { n: 1, reinicio: ahora + ventanaMin * 60_000 });
      return next();
    }
    if (++r.n > max) return res.status(429).json({ error: mensaje });
    next();
  };
}

/* ---------- Coordenadas ---------- */
/** Área aceptada para puntos del mapa: municipio de Quibdó y alrededores. */
export const LIMITES_MAPA = { latMin: 5.3, latMax: 6.1, lngMin: -77.1, lngMax: -76.3 };

export function coordenadas(lat, lng) {
  const la = Number(lat), lo = Number(lng);
  const L = LIMITES_MAPA;
  if (!(la >= L.latMin && la <= L.latMax && lo >= L.lngMin && lo <= L.lngMax))
    throw new ErrorHttp(400, 'La ubicación debe estar en Quibdó o sus alrededores. Toca el mapa para ubicarla.');
  return { lat: +la.toFixed(6), lng: +lo.toFixed(6) };
}

/* ---------- Texto de lecciones ---------- */
const escHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Convierte texto sencillo en HTML seguro (todo se escapa).
 *   Párrafos separados por línea en blanco · "- " lista · "1. " lista numerada · **negrita**
 */
export function textoAHtml(texto) {
  const enLinea = s => escHtml(s.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return texto.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(bloque => {
    const lineas = bloque.split('\n');
    if (lineas.every(l => /^\s*[-*•]\s+/.test(l)))
      return '<ul>' + lineas.map(l => `<li>${enLinea(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('') + '</ul>';
    if (lineas.every(l => /^\s*\d+[.)]\s+/.test(l)))
      return '<ol>' + lineas.map(l => `<li>${enLinea(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>';
    return `<p>${lineas.map(enLinea).join('<br>')}</p>`;
  }).join('');
}

/** Aproximación inversa para editar las lecciones iniciales (escritas en HTML). */
export function htmlATexto(html) {
  let texto = html.replace(/<ol>([\s\S]*?)<\/ol>/g, (_, items) => {
    let n = 0;
    return '\n' + items.replace(/<li>([\s\S]*?)<\/li>/g, (_, li) => `${++n}. ${li}\n`) + '\n';
  });
  texto = texto
    .replace(/<ul>/g, '\n').replace(/<\/ul>/g, '\n')
    .replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n')
    .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/?b>/g, '**')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  return texto.replace(/\n{3,}/g, '\n\n').trim();
}

/** Middleware final de errores. */
export function manejadorErrores(err, req, res, _next) {
  if (err instanceof ErrorHttp) return res.status(err.estado).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos mal formados.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Los datos enviados son demasiado grandes.' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}
