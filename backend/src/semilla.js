/**
 * Datos iniciales de la plataforma. Se insertan solo si las tablas están vacías.
 * NOTA: los puntos del mapa son DATOS DE EJEMPLO para el prototipo.
 */

const CURSOS = [
  { id: 'basica', icono: 'monitor', color: '', titulo: 'Informática básica', nivel: 'Principiante', publico: 'Estudiantes y adultos', lecciones: [
    { titulo: 'Conociendo el computador y el celular',
      contenido: `<p>Un dispositivo tiene <b>hardware</b> (lo que se toca: pantalla, teclado, batería) y <b>software</b> (los programas y aplicaciones).</p><ul><li><b>Encender y apagar bien:</b> usa siempre la opción “Apagar” del menú para no dañar archivos.</li><li><b>Archivos y carpetas:</b> una carpeta es como una caja donde guardas documentos.</li><li><b>Batería:</b> en zonas con cortes de energía, carga el equipo cuando haya luz y baja el brillo para que dure más.</li></ul>`,
      pregunta: '¿Cuál de estos es software?', opciones: ['El teclado', 'WhatsApp', 'La batería'], respuesta: 1 },
    { titulo: 'Teclado, mouse y pantalla táctil',
      contenido: `<ol><li><b>Clic izquierdo:</b> seleccionar. <b>Doble clic:</b> abrir.</li><li><b>Clic derecho:</b> ver más opciones.</li><li>En el celular: <b>tocar</b> = clic, <b>mantener presionado</b> = clic derecho.</li><li>Teclas útiles: <b>Shift</b> (mayúsculas), <b>Borrar</b>, <b>Enter</b> (aceptar o nueva línea).</li></ol>`,
      pregunta: 'En el celular, ¿qué equivale al clic derecho?', opciones: ['Tocar dos veces', 'Mantener presionado', 'Deslizar hacia arriba'], respuesta: 1 },
    { titulo: 'Guardar y encontrar archivos',
      contenido: `<p>Cuando guardes algo, fíjate <b>en qué carpeta</b> queda y ponle un <b>nombre claro</b>, por ejemplo: <i>Hoja_de_vida_Maria_2026</i>.</p><p>Para encontrarlo luego usa el buscador (la lupa) y escribe parte del nombre.</p>`,
      pregunta: '¿Cuál es un buen nombre para un archivo?', opciones: ['documento1', 'asdf', 'Tarea_Matematicas_Grado9'], respuesta: 2 },
  ]},
  { id: 'word', icono: 'documento', color: 'rio', titulo: 'Manejo de Word', nivel: 'Principiante', publico: 'Estudiantes, docentes y trabajadores', lecciones: [
    { titulo: 'Escribir y dar formato',
      contenido: `<ul><li><b>Negrita</b> (Ctrl+N o Ctrl+B), <i>cursiva</i> (Ctrl+K o Ctrl+I) y subrayado (Ctrl+S o Ctrl+U).</li><li>Cambia el tamaño de letra en la pestaña <b>Inicio</b>.</li><li>Usa <b>Títulos</b> para organizar tu documento.</li></ul><p>Sin computador puedes practicar con <b>Google Docs</b> o <b>Word</b> en el celular.</p>`,
      pregunta: '¿Para qué sirven los Títulos?', opciones: ['Para organizar el documento', 'Para borrar texto', 'Para imprimir'], respuesta: 0 },
    { titulo: 'Hacer una hoja de vida',
      contenido: `<ol><li>Datos personales y contacto.</li><li>Perfil: 3 o 4 líneas sobre ti.</li><li>Estudios y cursos (¡incluye los de esta plataforma!).</li><li>Experiencia, incluso trabajos informales o voluntariado.</li><li>Referencias.</li></ol><p>Guárdala también en <b>PDF</b>: Archivo → Guardar como → PDF.</p>`,
      pregunta: '¿En qué formato conviene enviar la hoja de vida?', opciones: ['PDF', 'Foto borrosa', 'Audio'], respuesta: 0 },
  ]},
  { id: 'excel', icono: 'tabla', color: 'oro', titulo: 'Manejo de Excel', nivel: 'Intermedio', publico: 'Emprendedores y trabajadores', lecciones: [
    { titulo: 'Celdas, filas y columnas',
      contenido: `<p>Excel es una cuadrícula. Las <b>columnas</b> tienen letras (A, B, C) y las <b>filas</b> números (1, 2, 3). Cada casilla es una <b>celda</b>, por ejemplo <b>B3</b>.</p>`,
      pregunta: 'La celda C5 está en…', opciones: ['Columna 5, fila C', 'Columna C, fila 5', 'Hoja 5'], respuesta: 1 },
    { titulo: 'Fórmulas para tu negocio',
      contenido: `<p>Toda fórmula empieza con <b>=</b>.</p><ul><li><b>=SUMA(B2:B10)</b>: total de ventas.</li><li><b>=PROMEDIO(B2:B10)</b>: venta promedio.</li><li><b>=B2*C2</b>: precio × cantidad.</li></ul><p>Ejemplo: lleva el control diario de las ventas de tu tienda o de tu venta de comidas típicas.</p>`,
      pregunta: '¿Con qué símbolo empieza una fórmula?', opciones: ['#', '=', '$'], respuesta: 1 },
  ]},
  { id: 'correo', icono: 'correo', color: 'tierra', titulo: 'Correo electrónico', nivel: 'Principiante', publico: 'Todos', lecciones: [
    { titulo: 'Crear y usar tu correo',
      contenido: `<ol><li>Crea una cuenta gratuita (Gmail, Outlook).</li><li>Usa un nombre serio: <i>nombre.apellido</i>.</li><li>Un correo tiene: <b>Para</b>, <b>Asunto</b>, <b>Mensaje</b> y <b>Adjuntos</b> (el ícono del clip).</li></ol><p>Lo vas a necesitar para inscribirte en becas, cursos y empleos.</p>`,
      pregunta: '¿Qué ícono sirve para adjuntar un archivo?', opciones: ['El clip', 'La papelera', 'La estrella'], respuesta: 0 },
  ]},
  { id: 'seguro', icono: 'escudo', color: '', titulo: 'Uso seguro de Internet', nivel: 'Todos', publico: 'Niños, jóvenes, adultos y mayores', lecciones: [
    { titulo: 'Contraseñas seguras',
      contenido: `<ul><li>Usa frases largas: <i>MiPerroComeMangoEnQuibdo!</i></li><li>No uses tu fecha de nacimiento ni “123456”.</li><li>Activa la <b>verificación en dos pasos</b>.</li><li>Nunca compartas códigos que te llegan por SMS.</li></ul>`,
      pregunta: '¿Cuál es la contraseña más segura?', opciones: ['123456', 'Fecha de nacimiento', 'Una frase larga con símbolos'], respuesta: 2 },
    { titulo: 'Cómo detectar estafas',
      contenido: `<p>Desconfía si un mensaje:</p><ul><li>Dice que <b>ganaste un premio</b> que no pediste.</li><li>Te pide <b>pagar</b> para recibir un subsidio, beca o empleo (los oficiales son gratuitos).</li><li>Tiene <b>urgencia</b>: “responde ya o pierdes”.</li><li>Te envía enlaces raros.</li></ul><p>Ante la duda, verifica en la página oficial de la entidad.</p>`,
      pregunta: 'Te piden pagar $50.000 para recibir una beca. ¿Qué haces?', opciones: ['Pago rápido', 'Desconfío y verifico en la página oficial', 'Comparto mis datos'], respuesta: 1 },
    { titulo: 'Redes sociales con cuidado',
      contenido: `<ul><li>Configura tu perfil como <b>privado</b>.</li><li>No publiques tu ubicación en tiempo real.</li><li>Piensa antes de publicar: lo que subes puede quedar para siempre.</li><li>Si sufres acoso, bloquea, guarda pruebas y cuéntale a alguien de confianza.</li></ul>`,
      pregunta: '¿Qué es recomendable en redes sociales?', opciones: ['Perfil privado', 'Publicar dónde estoy siempre', 'Aceptar a todos los desconocidos'], respuesta: 0 },
  ]},
];

// Coordenadas APROXIMADAS de ejemplo alrededor del centro de Quibdó. Deben verificarse en campo.
const PUNTOS = [
  { nombre: 'Parque Centenario (Centro)', tipo: 'wifi', lat: 5.6936, lng: -76.6585, horario: 'Todo el día', senal: 'Buena', descripcion: 'Zona Wi-Fi pública en espacio abierto.' },
  { nombre: 'Biblioteca pública', tipo: 'comunitario', lat: 5.6929, lng: -76.6602, horario: 'Lun–Sáb 8:00–18:00', senal: 'Buena', descripcion: 'Computadores de uso libre y préstamo de libros.' },
  { nombre: 'Universidad Tecnológica del Chocó', tipo: 'comunitario', lat: 5.6865, lng: -76.6475, horario: 'Lun–Vie 7:00–19:00', senal: 'Buena', descripcion: 'Salas de cómputo para estudiantes.' },
  { nombre: 'Centro SENA', tipo: 'comunitario', lat: 5.6990, lng: -76.6480, horario: 'Lun–Vie 7:00–18:00', senal: 'Regular', descripcion: 'Ambientes de formación y orientación.' },
  { nombre: 'Malecón', tipo: 'wifi', lat: 5.6955, lng: -76.6625, horario: '6:00–22:00', senal: 'Regular', descripcion: 'Wi-Fi público junto al río.' },
  { nombre: 'Institución educativa (sector norte)', tipo: 'comunitario', lat: 5.7060, lng: -76.6560, horario: 'Jornada escolar', senal: 'Regular', descripcion: 'Sala de informática con acceso comunitario por las tardes.' },
  { nombre: 'Plaza de mercado', tipo: 'wifi', lat: 5.6918, lng: -76.6618, horario: '5:00–17:00', senal: 'Mala en horas pico', descripcion: 'Señal saturada en horas de mucha gente.' },
  { nombre: 'Sector oriental (periferia)', tipo: 'zona', lat: 5.6930, lng: -76.6330, radio: 700, senal: 'Muy mala', descripcion: 'Poca cobertura móvil, sin puntos Wi-Fi cercanos.' },
  { nombre: 'Sector sur, orilla del río', tipo: 'zona', lat: 5.6740, lng: -76.6600, radio: 600, senal: 'Mala', descripcion: 'Cobertura intermitente; frecuentes cortes de energía.' },
  { nombre: 'Corregimientos río arriba', tipo: 'zona', lat: 5.6450, lng: -76.6850, radio: 1500, senal: 'Sin cobertura', descripcion: 'Acceso solo por río; se recomiendan contenidos descargables.' },
];

const RECURSOS = [
  { titulo: 'Guía rápida: atajos de teclado', tipo: 'Guía', tema: 'Informática', icono: 'monitor', contenido: `ATAJOS DE TECLADO ÚTILES\n\nCtrl + C  → Copiar\nCtrl + V  → Pegar\nCtrl + X  → Cortar\nCtrl + Z  → Deshacer\nCtrl + G  → Guardar (Ctrl + S en inglés)\nCtrl + P  → Imprimir\nAlt + Tab → Cambiar de ventana\nWindows + D → Ver el escritorio` },
  { titulo: 'Cómo hacer tu hoja de vida en Word', tipo: 'Guía', tema: 'Word', icono: 'documento', contenido: `HOJA DE VIDA PASO A PASO\n\n1. Datos personales: nombre, cédula, teléfono, correo.\n2. Perfil profesional (3-4 líneas).\n3. Formación académica (del más reciente al más antiguo).\n4. Cursos y certificados.\n5. Experiencia laboral (incluye voluntariado y trabajos informales).\n6. Habilidades (ej: manejo de Excel, atención al cliente).\n7. Referencias personales y laborales.\n\nGuárdala en PDF: Archivo > Guardar como > PDF.` },
  { titulo: 'Plantilla de control de ventas en Excel', tipo: 'Plantilla', tema: 'Excel', icono: 'tabla', extension: 'csv', contenido: `Fecha,Producto,Cantidad,Precio unitario,Total\n2026-11-01,Ejemplo producto,2,5000,=C2*D2\n,,,,\nTOTAL,,,,=SUMA(E2:E30)` },
  { titulo: '10 fórmulas básicas de Excel', tipo: 'Guía', tema: 'Excel', icono: 'tabla', contenido: `FÓRMULAS BÁSICAS DE EXCEL\n\n=SUMA(A1:A10)\n=PROMEDIO(A1:A10)\n=MAX(A1:A10)\n=MIN(A1:A10)\n=CONTAR(A1:A10)\n=SI(A1>=3;"Aprobó";"Reprobó")\n=A1*B1\n=A1/B1\n=REDONDEAR(A1;0)\n=HOY()` },
  { titulo: 'Cómo crear y usar un correo electrónico', tipo: 'Guía', tema: 'Correo', icono: 'correo', contenido: `CORREO ELECTRÓNICO\n\n1. Entra a gmail.com u outlook.com y elige "Crear cuenta".\n2. Usa un nombre serio: nombre.apellido@...\n3. Anota tu contraseña en un lugar seguro.\n4. Para enviar: Redactar > Para > Asunto > Mensaje > Enviar.\n5. Para adjuntar: usa el ícono del clip.\n6. Revisa la carpeta "Spam" si no encuentras un correo.` },
  { titulo: 'Checklist: ¿es una estafa?', tipo: 'Guía', tema: 'Seguridad', icono: 'escudo', contenido: `¿ES UNA ESTAFA? Revisa:\n\n[ ] ¿Te piden dinero para darte un premio, beca o empleo?\n[ ] ¿Te presionan para responder rápido?\n[ ] ¿El enlace se ve raro o tiene errores?\n[ ] ¿Te piden claves o códigos que te llegaron por SMS?\n[ ] ¿El mensaje viene de un número desconocido?\n\nSi marcaste alguna: NO respondas, verifica en la página oficial.\nDenuncia: CAI Virtual de la Policía Nacional.` },
  { titulo: 'Ahorra datos en tu celular', tipo: 'Guía', tema: 'Conectividad', icono: 'wifi', contenido: `CÓMO AHORRAR DATOS\n\n- Desactiva la descarga automática de fotos y videos en WhatsApp.\n- Descarga videos y documentos cuando estés en Wi-Fi.\n- Usa versiones "Lite" de las aplicaciones.\n- Activa el "Ahorro de datos" en Ajustes.\n- Baja la calidad de los videos (360p).\n- Guarda páginas para leerlas sin conexión.` },
  { titulo: 'Contraseñas seguras y verificación en dos pasos', tipo: 'Guía', tema: 'Seguridad', icono: 'candado', contenido: `CONTRASEÑAS SEGURAS\n\n- Usa frases largas con mayúsculas, números y símbolos.\n- Una contraseña diferente para cada cuenta importante.\n- Activa la verificación en dos pasos en WhatsApp, correo y redes.\n- Nunca compartas los códigos que llegan por SMS.` },
];

const OPORTUNIDADES = [
  { titulo: 'Formación técnica y tecnológica gratuita', tipo: 'Curso', entidad: 'SENA', descripcion: 'Programas presenciales y virtuales sin costo. Inscripción por la plataforma oficial del SENA.', url: 'https://www.sena.edu.co' },
  { titulo: 'Agencia Pública de Empleo', tipo: 'Empleo', entidad: 'SENA', descripcion: 'Registro de hoja de vida, orientación ocupacional y vacantes en el Chocó.', url: 'https://agenciapublicadeempleo.sena.edu.co' },
  { titulo: 'Créditos y becas para educación superior', tipo: 'Beca', entidad: 'ICETEX', descripcion: 'Créditos educativos, condonaciones y convocatorias de becas nacionales e internacionales.', url: 'https://web.icetex.gov.co' },
  { titulo: 'Programas de formación en habilidades digitales', tipo: 'Curso', entidad: 'MinTIC', descripcion: 'Cursos gratuitos de programación, análisis de datos y habilidades digitales.', url: 'https://www.mintic.gov.co' },
  { titulo: 'Fondo Emprender', tipo: 'Emprendimiento', entidad: 'SENA', descripcion: 'Capital semilla para ideas de negocio de aprendices y egresados.', url: 'https://www.fondoemprender.com' },
  { titulo: 'Convocatorias de becas en el exterior', tipo: 'Beca', entidad: 'Colombia Aprende', descripcion: 'Información oficial sobre becas ofrecidas por gobiernos y cooperantes.', url: 'https://www.colombiaaprende.edu.co' },
  { titulo: 'Servicio Público de Empleo', tipo: 'Empleo', entidad: 'Unidad del Servicio Público de Empleo', descripcion: 'Buscador de vacantes formales en todo el país, incluido Quibdó.', url: 'https://www.serviciodeempleo.gov.co' },
  { titulo: 'Convocatorias de cultura y economía creativa', tipo: 'Convocatoria', entidad: 'Ministerio de las Culturas', descripcion: 'Estímulos para artistas, músicos y gestores culturales del Pacífico.', url: 'https://www.mincultura.gov.co' },
  { titulo: 'Apoyo a emprendimientos y mipymes', tipo: 'Emprendimiento', entidad: 'iNNpulsa Colombia', descripcion: 'Programas de aceleración y fortalecimiento empresarial.', url: 'https://www.innpulsacolombia.com' },
  { titulo: 'Convocatorias para jóvenes investigadores', tipo: 'Convocatoria', entidad: 'Minciencias', descripcion: 'Programas para jóvenes investigadores e innovadores.', url: 'https://minciencias.gov.co' },
];

const vacia = async (db, tabla) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get()).n === 0;

export async function sembrar(db, transaccion) {
  await transaccion(async () => {
    if (await vacia(db, 'cursos')) {
      const insCurso = db.prepare('INSERT INTO cursos (id, titulo, icono, color, nivel, publico, orden) VALUES (?,?,?,?,?,?,?)');
      const insLeccion = db.prepare('INSERT INTO lecciones (curso_id, orden, titulo, contenido, pregunta, opciones, respuesta) VALUES (?,?,?,?,?,?,?)');
      for (const [i, c] of CURSOS.entries()) {
        await insCurso.run(c.id, c.titulo, c.icono, c.color, c.nivel, c.publico, i);
        for (const [j, l] of c.lecciones.entries())
          await insLeccion.run(c.id, j, l.titulo, l.contenido, l.pregunta, JSON.stringify(l.opciones), l.respuesta);
      }
    }
    if (await vacia(db, 'puntos')) {
      const ins = db.prepare('INSERT INTO puntos (nombre, tipo, lat, lng, radio, horario, senal, descripcion) VALUES (?,?,?,?,?,?,?,?)');
      for (const p of PUNTOS) await ins.run(p.nombre, p.tipo, p.lat, p.lng, p.radio ?? null, p.horario ?? null, p.senal, p.descripcion);
    }
    if (await vacia(db, 'recursos')) {
      const ins = db.prepare('INSERT INTO recursos (titulo, tipo, tema, icono, extension, contenido) VALUES (?,?,?,?,?,?)');
      for (const r of RECURSOS) await ins.run(r.titulo, r.tipo, r.tema, r.icono, r.extension || 'txt', r.contenido);
    }
    if (await vacia(db, 'oportunidades')) {
      const ins = db.prepare('INSERT INTO oportunidades (titulo, tipo, entidad, descripcion, url) VALUES (?,?,?,?,?)');
      for (const o of OPORTUNIDADES) await ins.run(o.titulo, o.tipo, o.entidad, o.descripcion, o.url);
    }
  });
}
