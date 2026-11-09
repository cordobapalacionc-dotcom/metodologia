/**
 * Tablero de impacto: cifras para mostrar a aliados (Alcaldía, Gobernación, SENA, MinTIC…).
 * Todo se calcula en el momento a partir de la base de datos.
 */
import { db } from './db.js';
import { OPCIONES } from './rutas/diagnosticos.js';

const uno = (sql, ...p) => db.prepare(sql).get(...p);
const todos = (sql, ...p) => db.prepare(sql).all(...p);
const NIVELES = { 1: 'Ninguno', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado' };

/** Últimos 12 meses como ['2025-12', …, '2026-11']. */
function meses() {
  const hoy = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const f = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 11 + i, 1));
    return f.toISOString().slice(0, 7);
  });
}

/** Cuenta por mes una columna de fecha de una tabla. */
function porMes(tabla, columna, lista) {
  const filas = todos(`SELECT substr(${columna}, 1, 7) AS mes, COUNT(*) AS n FROM ${tabla}
                       WHERE substr(${columna}, 1, 7) >= ? GROUP BY mes`, lista[0]);
  const mapa = Object.fromEntries(filas.map(f => [f.mes, f.n]));
  return lista.map(m => mapa[m] || 0);
}

export function calcularImpacto() {
  const personas = uno('SELECT COUNT(*) AS n FROM usuarios').n;
  // Formada = completó al menos una lección o tiene un certificado (aunque su curso se haya borrado después)
  const formadas = uno('SELECT COUNT(*) AS n FROM (SELECT usuario_id FROM progreso UNION SELECT usuario_id FROM certificados)').n;
  const certificadas = uno('SELECT COUNT(DISTINCT usuario_id) AS n FROM certificados').n;

  // Personas que empezaron un curso y cuántas lo terminaron
  const avance = todos(`
    SELECT p.usuario_id, l.curso_id, COUNT(*) AS hechas,
      (SELECT COUNT(*) FROM lecciones l2 WHERE l2.curso_id = l.curso_id) AS total
    FROM progreso p JOIN lecciones l ON l.id = p.leccion_id
    GROUP BY p.usuario_id, l.curso_id`);
  const iniciados = avance.length;
  const terminados = avance.filter(a => a.hechas >= a.total).length;

  /* ---------- Por barrio y por perfil ---------- */
  const agrupar = columna => todos(`
    SELECT COALESCE(NULLIF(TRIM(MAX(u.${columna})), ''), 'Sin dato') AS nombre,
      COUNT(*) AS personas,
      SUM(EXISTS (SELECT 1 FROM progreso p WHERE p.usuario_id = u.id)
          OR EXISTS (SELECT 1 FROM certificados c WHERE c.usuario_id = u.id)) AS formadas,
      SUM(EXISTS (SELECT 1 FROM certificados c WHERE c.usuario_id = u.id)) AS certificadas
    FROM usuarios u GROUP BY LOWER(TRIM(COALESCE(u.${columna}, ''))) ORDER BY personas DESC, nombre`);
  const barrios = agrupar('barrio');
  const perfiles = agrupar('perfil');

  /* ---------- Por curso ---------- */
  const cursos = todos(`
    SELECT c.id, c.titulo, c.codigo_acceso IS NOT NULL AS grupo, a.nombre AS facilitador,
      (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS lecciones,
      (SELECT COUNT(*) FROM certificados ce WHERE ce.curso_id = c.id) AS certificados
    FROM cursos c LEFT JOIN usuarios a ON a.id = c.autor_id ORDER BY c.orden`)
    .map(c => {
      const de = avance.filter(a => a.curso_id === c.id);
      return { ...c, grupo: !!c.grupo, iniciaron: de.length, terminaron: de.filter(a => a.hechas >= a.total).length };
    })
    .sort((a, b) => b.iniciaron - a.iniciaron);

  /* ---------- Diagnóstico de la comunidad ---------- */
  const diagnosticos = uno('SELECT COUNT(*) AS n FROM diagnosticos').n;
  const contar = (columna, opciones) => {
    const m = Object.fromEntries(todos(`SELECT ${columna} AS v, COUNT(*) AS n FROM diagnosticos GROUP BY ${columna}`).map(f => [f.v, f.n]));
    return opciones.map(o => ({ nombre: o, n: m[o] || 0 }));
  };
  const dificultades = (() => {
    const m = Object.fromEntries(todos(`
      SELECT j.value AS v, COUNT(*) AS n FROM diagnosticos d, json_each(d.dificultades) j GROUP BY j.value`).map(f => [f.v, f.n]));
    return OPCIONES.dificultades.map(o => ({ nombre: o, n: m[o] || 0 })).sort((a, b) => b.n - a.n);
  })();
  const niveles = (() => {
    const m = Object.fromEntries(todos('SELECT nivel AS v, COUNT(*) AS n FROM diagnosticos GROUP BY nivel').map(f => [f.v, f.n]));
    return Object.entries(NIVELES).map(([k, nombre]) => ({ nombre, n: m[k] || 0 }));
  })();

  /* ---------- Conectividad ---------- */
  const puntos = Object.fromEntries(todos(
    'SELECT tipo, COUNT(*) AS n FROM puntos WHERE verificado = 1 GROUP BY tipo').map(f => [f.tipo, f.n]));

  /* ---------- Facilitadores ---------- */
  const facilitadores = {
    personas: uno("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'facilitador'").n,
    grupos: uno('SELECT COUNT(*) AS n FROM cursos WHERE codigo_acceso IS NOT NULL').n,
    estudiantes: uno('SELECT COUNT(DISTINCT usuario_id) AS n FROM inscripciones').n,
  };

  const lista = meses();
  return {
    generado: new Date().toISOString(),
    resumen: {
      personas, formadas, certificadas,
      certificados: uno('SELECT COUNT(*) AS n FROM certificados').n,
      lecciones: uno('SELECT COUNT(*) AS n FROM progreso').n,
      iniciados, terminados,
      diagnosticos,
      wifi: (puntos.wifi || 0) + (puntos.comunitario || 0),
      zonas: puntos.zona || 0,
      pendientes: uno('SELECT COUNT(*) AS n FROM puntos WHERE verificado = 0').n,
    },
    meses: lista,
    serie: {
      registros: porMes('usuarios', 'creado', lista),
      lecciones: porMes('progreso', 'fecha', lista),
      certificados: porMes('certificados', 'fecha', lista),
      diagnosticos: porMes('diagnosticos', 'fecha', lista),
    },
    barrios, perfiles, cursos,
    diagnostico: {
      internet: contar('internet', OPCIONES.internet),
      calidad: contar('calidad', OPCIONES.calidad),
      niveles,
      dificultades,
    },
    facilitadores,
  };
}

/* ---------- CSV para entregar a aliados ---------- */
const celda = v => {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const filas = arr => arr.map(f => f.map(celda).join(';')).join('\n');

export function impactoCsv(d) {
  const r = d.resumen;
  return [
    filas([['Quibdó Conecta · Informe de impacto'], ['Generado', d.generado.slice(0, 10)], []]),
    filas([['Indicador', 'Valor'],
      ['Personas registradas', r.personas], ['Personas que completaron al menos una lección', r.formadas],
      ['Personas con certificado', r.certificadas], ['Certificados emitidos', r.certificados],
      ['Lecciones completadas', r.lecciones], ['Cursos iniciados (persona-curso)', r.iniciados],
      ['Cursos terminados (persona-curso)', r.terminados], ['Diagnósticos digitales', r.diagnosticos],
      ['Puntos de acceso verificados', r.wifi], ['Zonas con dificultad de señal', r.zonas],
      ['Facilitadores', d.facilitadores.personas], ['Grupos (cursos de facilitadores)', d.facilitadores.grupos],
      ['Estudiantes en grupos', d.facilitadores.estudiantes], []]),
    filas([['Mes', 'Registros', 'Lecciones completadas', 'Certificados', 'Diagnósticos'],
      ...d.meses.map((m, i) => [m, d.serie.registros[i], d.serie.lecciones[i], d.serie.certificados[i], d.serie.diagnosticos[i]]), []]),
    filas([['Barrio', 'Personas', 'Formadas', 'Certificadas'], ...d.barrios.map(b => [b.nombre, b.personas, b.formadas, b.certificadas]), []]),
    filas([['Perfil', 'Personas', 'Formadas', 'Certificadas'], ...d.perfiles.map(b => [b.nombre, b.personas, b.formadas, b.certificadas]), []]),
    filas([['Curso', 'Tipo', 'Facilitador', 'Iniciaron', 'Terminaron', 'Certificados'],
      ...d.cursos.map(c => [c.titulo, c.grupo ? 'Grupo' : 'Abierto', c.facilitador ?? '', c.iniciaron, c.terminaron, c.certificados]), []]),
    filas([['Acceso a Internet (diagnóstico)', 'Personas'], ...d.diagnostico.internet.map(x => [x.nombre, x.n]), []]),
    filas([['Calidad de la conexión', 'Personas'], ...d.diagnostico.calidad.map(x => [x.nombre, x.n]), []]),
    filas([['Nivel de manejo de la tecnología', 'Personas'], ...d.diagnostico.niveles.map(x => [x.nombre, x.n]), []]),
    filas([['Principales dificultades', 'Personas'], ...d.diagnostico.dificultades.map(x => [x.nombre, x.n])]),
  ].join('\n') + '\n';
}
