/**
 * Tablero de impacto (panel de administración).
 * Gráficas hechas con HTML y CSS, sin librerías: cargan rápido y se imprimen bien.
 *  - Cifras principales en tarjetas.
 *  - Evolución mensual: una gráfica de columnas por indicador, cada una con su propia escala
 *    (nunca dos medidas distintas en el mismo eje).
 *  - Comparaciones (barrios, perfiles, cursos, diagnóstico): barras horizontales con el valor escrito.
 */
import { ico, esc, vacio } from './comun.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const nombreMes = m => { const [a, n] = m.split('-'); return `${MESES[n - 1]} ${a.slice(2)}`; };
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const num = n => n.toLocaleString('es-CO');

/** Tarjeta con una cifra principal. */
const tarjeta = (icono, valor, texto, detalle = '') => `
  <div class="card cifra-impacto">
    <span class="cifra-ico">${ico(icono)}</span>
    <b>${valor}</b>
    <span>${esc(texto)}</span>
    ${detalle ? `<small>${detalle}</small>` : ''}
  </div>`;

/**
 * Gráfica de columnas de una sola serie (un mes por columna).
 * El valor de cada mes aparece al pasar el dedo o el ratón, y en la tabla "Ver datos".
 */
function columnas(titulo, meses, valores) {
  const max = Math.max(...valores, 1);
  const total = valores.reduce((s, v) => s + v, 0);
  return `
    <figure class="card grafica-meses">
      <figcaption><b>${esc(titulo)}</b><span>${num(total)} en 12 meses</span></figcaption>
      <div class="columnas" role="img" aria-label="${esc(titulo)} por mes: ${meses.map((m, i) => `${nombreMes(m)} ${valores[i]}`).join(', ')}">
        ${valores.map((v, i) => `
          <div class="col" tabindex="0" data-tip="${nombreMes(meses[i])}: ${num(v)}">
            <span class="col-barra${v ? '' : ' cero'}" style="height:${v ? Math.max(v / max * 100, 3) : 0}%"></span>
          </div>`).join('')}
      </div>
      <div class="columnas-eje" aria-hidden="true">${meses.map((m, i) => `<span>${i % 2 ? '' : nombreMes(m)}</span>`).join('')}</div>
      <details class="ver-datos">
        <summary>Ver datos</summary>
        <table class="tabla tabla-mini"><thead><tr><th>Mes</th><th>${esc(titulo)}</th></tr></thead>
          <tbody>${meses.map((m, i) => `<tr><td>${nombreMes(m)}</td><td>${num(valores[i])}</td></tr>`).join('')}</tbody></table>
      </details>
    </figure>`;
}

/**
 * Barras horizontales: cada fila con su nombre, la barra y el valor escrito.
 *   items: [{ nombre, n, detalle? }]
 */
function barras(items, { maximo, vacioTexto = 'Sin datos todavía.' } = {}) {
  const max = maximo ?? Math.max(...items.map(x => x.n), 1);
  if (!items.length || items.every(x => !x.n)) return `<p class="vacio-mini">${esc(vacioTexto)}</p>`;
  return `<div class="barras">${items.map(x => `
    <div class="fila-barra" title="${esc(x.nombre)}: ${num(x.n)}">
      <span class="barra-nombre">${esc(x.nombre)}</span>
      <span class="barra-pista"><span class="barra-relleno" style="width:${x.n ? Math.max(x.n / max * 100, 1.5) : 0}%"></span></span>
      <span class="barra-valor">${num(x.n)}</span>
      ${x.detalle !== undefined ? `<span class="barra-detalle">${x.detalle}</span>` : ''}
    </div>`).join('')}</div>`;
}

const seccion = (icono, titulo, explicacion, contenido) => `
  <section class="card bloque-impacto">
    <h3>${ico(icono)} ${esc(titulo)}</h3>
    ${explicacion ? `<p class="explica">${esc(explicacion)}</p>` : ''}
    ${contenido}
  </section>`;

export function pintarImpacto(el, d) {
  const r = d.resumen;
  const generado = new Date(d.generado).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
  const top = (lista, n = 10) => {
    if (lista.length <= n) return lista;
    const resto = lista.slice(n - 1);
    return [...lista.slice(0, n - 1), {
      nombre: `Otros (${resto.length})`,
      personas: resto.reduce((s, x) => s + x.personas, 0),
      formadas: resto.reduce((s, x) => s + x.formadas, 0),
      certificadas: resto.reduce((s, x) => s + x.certificadas, 0),
    }];
  };
  const grupos = lista => barras(top(lista).map(b => ({
    nombre: b.nombre, n: b.personas,
    detalle: `${num(b.formadas)} formadas · ${num(b.certificadas)} con certificado`,
  })));
  const diag = d.diagnostico;

  el.innerHTML = `
    <p class="generado">Datos al ${esc(generado)}</p>

    <div class="cifras-impacto">
      ${tarjeta('usuarios', num(r.personas), 'personas registradas')}
      ${tarjeta('libro', num(r.formadas), 'personas formadas', `${pct(r.formadas, r.personas)}% de las personas registradas`)}
      ${tarjeta('birrete', num(r.certificadas), 'personas con certificado', `${num(r.certificados)} certificados emitidos`)}
      ${tarjeta('check', `${pct(r.terminados, r.iniciados)}%`, 'de los cursos iniciados se terminan', `${num(r.terminados)} de ${num(r.iniciados)}`)}
      ${tarjeta('grafica', num(r.diagnosticos), 'diagnósticos digitales')}
      ${tarjeta('wifi', num(r.wifi), 'puntos de acceso verificados', `${num(r.zonas)} zonas con dificultad de señal${r.pendientes ? ` · ${r.pendientes} reportes por verificar` : ''}`)}
    </div>

    <h3 class="subtitulo-impacto">${ico('grafica')} Últimos 12 meses</h3>
    <div class="grid-meses">
      ${columnas('Personas nuevas', d.meses, d.serie.registros)}
      ${columnas('Lecciones completadas', d.meses, d.serie.lecciones)}
      ${columnas('Certificados', d.meses, d.serie.certificados)}
      ${columnas('Diagnósticos', d.meses, d.serie.diagnosticos)}
    </div>

    <div class="grid-impacto">
      ${seccion('pin', 'Personas por barrio', 'La barra es el número de personas registradas.', grupos(d.barrios))}
      ${seccion('usuarios', 'Personas por perfil', 'La barra es el número de personas registradas.', grupos(d.perfiles))}
    </div>

    ${seccion('libro', 'Cursos', 'La barra es cuántas personas empezaron cada curso; al lado, cuántas lo terminaron.',
      barras(d.cursos.map(c => ({
        nombre: c.grupo ? `${c.titulo} (grupo)` : c.titulo,
        n: c.iniciaron,
        detalle: `${num(c.terminaron)} terminaron (${pct(c.terminaron, c.iniciaron)}%) · ${num(c.certificados)} certificados`,
      })), { vacioTexto: 'Nadie ha empezado un curso todavía.' }))}

    <h3 class="subtitulo-impacto">${ico('grafica')} Lo que dice el diagnóstico digital</h3>
    ${diag.internet.some(x => x.n) ? `
    <div class="grid-impacto">
      ${seccion('wifi', 'Cómo se conectan a Internet', `${num(r.diagnosticos)} diagnósticos.`, barras(diag.internet))}
      ${seccion('wifi-off', 'Calidad de la conexión', '', barras(diag.calidad))}
      ${seccion('alerta', 'Principales dificultades', 'Cada persona puede marcar varias.', barras(diag.dificultades))}
      ${seccion('monitor', 'Manejo de la tecnología', 'Según la propia persona, de 1 (ninguno) a 4 (avanzado).', barras(diag.niveles))}
    </div>` : vacio('grafica', 'Todavía no hay diagnósticos. Haz jornadas de diagnóstico para conocer la situación de la comunidad.')}

    ${seccion('usuarios', 'Facilitadores', 'Docentes y líderes que acompañan grupos con cursos propios.', `
      <div class="cifras-mini">
        <div><b>${num(d.facilitadores.personas)}</b><span>facilitadores</span></div>
        <div><b>${num(d.facilitadores.grupos)}</b><span>cursos de grupo</span></div>
        <div><b>${num(d.facilitadores.estudiantes)}</b><span>estudiantes en grupos</span></div>
      </div>`)}

    <p class="nota-impacto">“Personas formadas”: completaron al menos una lección o tienen un certificado. Los datos del diagnóstico incluyen
      los registrados en jornadas de campo (anónimos). Las personas sin barrio aparecen como “Sin dato”.</p>`;
}
