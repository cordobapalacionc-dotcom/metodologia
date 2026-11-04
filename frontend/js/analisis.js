/**
 * Análisis del diagnóstico digital.
 * Módulo COMPARTIDO: lo usa el backend (rutas/diagnosticos.js) y el navegador
 * cuando no hay conexión, para que el resultado sea el mismo en ambos casos.
 */

/** Cursos que pueden aparecer en la ruta recomendada (si el backend no envía otros datos). */
export const CURSOS_RUTA = {
  basica: { titulo: 'Informática básica', icono: 'monitor' },
  correo: { titulo: 'Correo electrónico', icono: 'correo' },
  seguro: { titulo: 'Uso seguro de Internet', icono: 'escudo' },
  word: { titulo: 'Manejo de Word', icono: 'documento' },
  excel: { titulo: 'Manejo de Excel', icono: 'tabla' },
};

export function analizar(d, cursos = CURSOS_RUTA) {
  let acceso = 0;
  if (d.dispositivos.includes('Computador')) acceso += 25;
  else if (d.dispositivos.includes('Celular') || d.dispositivos.includes('Tableta')) acceso += 15;
  acceso += { Hogar: 25, Datos: 15, Público: 10 }[d.internet] ?? 0;
  acceso += { 'Buena': 25, 'Regular, a veces se cae': 15, 'Mala, casi no funciona': 5 }[d.calidad] ?? 0;
  acceso += { 'Todos los días': 25, 'Algunos días a la semana': 15, 'Rara vez': 5 }[d.frecuencia] ?? 0;
  const habilidades = Math.round((d.nivel - 1) / 3 * 100);
  const dif = d.dificultades;

  const ids = [];
  if (d.nivel <= 2) ids.push('basica');
  if (d.nivel <= 2 || dif.includes('No sé usar programas')) ids.push('correo');
  ids.push('seguro');
  if (d.nivel >= 2) ids.push('word');
  if (d.nivel >= 3 || dif.includes('No sé usar programas')) ids.push('excel');
  const ruta = ids.filter(id => cursos[id]).map(id => ({ id, titulo: cursos[id].titulo, icono: cursos[id].icono }));

  const consejos = [];
  if (acceso < 50 || dif.includes('Mala señal'))
    consejos.push({ texto: 'Ubica puntos de Wi-Fi gratuito cerca de ti en el mapa de conectividad.', pagina: '/conectividad' });
  if (dif.includes('Costo de datos/Internet') || d.internet === 'Datos')
    consejos.push({ texto: 'Descarga las guías para leerlas sin conexión, en especial “Ahorra datos en tu celular”.', pagina: '/recursos' });
  if (dif.includes('No tengo equipo') || d.dispositivos.includes('Ninguno'))
    consejos.push({ texto: 'Bibliotecas, colegios y el SENA ofrecen computadores de uso libre.', pagina: '/conectividad' });
  if (dif.includes('Miedo a estafas'))
    consejos.push({ texto: 'Empieza por el curso “Uso seguro de Internet”: aprenderás a reconocer estafas.', pagina: '/aula' });
  if (dif.includes('Cortes de energía'))
    consejos.push({ texto: 'Carga tus equipos cuando haya luz y descarga contenidos con anticipación.' });
  if (dif.includes('Falta de tiempo'))
    consejos.push({ texto: 'Las lecciones duran menos de 5 minutos: haz una al día.' });
  consejos.push({ texto: 'Revisa las oportunidades de cursos gratuitos, becas y empleo.', pagina: '/oportunidades' });

  const perfil =
    acceso >= 70 && habilidades >= 66 ? 'Conectado y con buenas habilidades' :
    acceso >= 50 ? (habilidades >= 50 ? 'Conectado, puede seguir avanzando' : 'Con acceso, necesita formación básica') :
    habilidades >= 50 ? 'Con habilidades, pero con barreras de acceso' :
    'Requiere apoyo prioritario en acceso y formación';

  return { acceso, habilidades, perfil, ruta, consejos };
}
