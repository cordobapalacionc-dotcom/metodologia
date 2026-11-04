# Quibdó Conecta

**Plataforma de inclusión digital para Quibdó (Chocó, Colombia)**: aprender, conectarse y encontrar oportunidades, incluso con poca señal.

Quibdó Conecta reúne en un solo lugar formación digital básica, información de conectividad, recursos para estudiar sin Internet, oportunidades de estudio y empleo, y un diagnóstico que permite conocer la situación digital de cada persona y de la comunidad. Está pensada para celulares sencillos y conexiones inestables.

---

## Tabla de contenido

- [El problema](#el-problema)
- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Primer administrador](#primer-administrador)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API](#api)
- [Funcionamiento sin conexión](#funcionamiento-sin-conexión)
- [Seguridad](#seguridad)
- [Limitaciones del prototipo](#limitaciones-del-prototipo)
- [Próximos pasos](#próximos-pasos)

---

## El problema

En Quibdó y en muchas zonas del Chocó, una parte importante de la población tiene acceso limitado a Internet, a computadores y a formación en herramientas digitales. Esto reduce las posibilidades de estudiar, conseguir empleo, acceder a becas o emprender.

**Quibdó Conecta** busca reducir esa brecha con una plataforma liviana que:

- enseña habilidades digitales básicas en lenguaje sencillo,
- muestra dónde hay acceso a Internet gratuito o comunitario,
- permite descargar material para estudiar sin conexión,
- centraliza oportunidades de formación, empleo y emprendimiento, y
- recoge un **diagnóstico digital** que ayuda a orientar a cada persona y a priorizar acciones en la comunidad.

## Funcionalidades

### Para las personas usuarias

| Sección | Qué permite hacer |
|---|---|
| **Cuenta** | Registrarse, iniciar sesión o entrar como invitado. |
| **Aula virtual** | Cursos cortos de informática básica, Word, Excel, correo electrónico y uso seguro de Internet. Cada lección termina con una pregunta que corrige el servidor. El avance queda guardado. |
| **Certificados** | Al completar un curso se emite un certificado de participación con **código de verificación público**, descargable en PDF. |
| **Mapa de conectividad** | Mapa real (OpenStreetMap) con puntos de Wi-Fi gratuito, sitios de acceso comunitario y zonas con mala señal. Incluye *Mi ubicación*, el punto más cercano y *Cómo llegar*. La comunidad puede **reportar** puntos nuevos tocando el mapa. |
| **Banco de recursos** | Guías y plantillas muy livianas (menos de 5 KB) para descargar y leer sin Internet. |
| **Oportunidades** | Becas, cursos gratuitos, empleo, convocatorias y emprendimiento, con enlace a la fuente oficial. Se pueden guardar. |
| **Diagnóstico digital** | Un formulario de 7 preguntas que da un puntaje de acceso y de habilidades, una ruta de cursos recomendada y consejos. Funciona **sin conexión**: se guarda en el dispositivo y se envía al volver la señal. |
| **Mi panel** | Avance por curso, certificados, evolución de los diagnósticos, actividad reciente, oportunidades guardadas, descargas y reportes. Permite editar los datos y cambiar la contraseña. |

### Para jornadas de campo

- **Modo jornada:** una persona promotora puede registrar diagnósticos de otras personas desde su celular, incluso sin señal. Se guardan de forma anónima y se sincronizan después.
- **Panel de la comunidad:** estadísticas anónimas sobre acceso, dificultades, tipo de conexión y barrios.

### Para administradores (`/admin`)

- Resumen general de la plataforma.
- Revisión de los reportes del mapa: aprobar, corregir o eliminar.
- Creación y edición de cursos y lecciones (en texto sencillo).
- Publicación de oportunidades.
- Gestión de roles de usuario.
- Exportación de los diagnósticos a CSV para análisis.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Servidor | [Node.js](https://nodejs.org) 22.13 o superior + [Express 5](https://expressjs.com) |
| Base de datos | SQLite, con el módulo `node:sqlite` que trae Node (no requiere instalar nada más) |
| Frontend | HTML, CSS y JavaScript sin frameworks, con módulos ES |
| Mapa | [Leaflet](https://leafletjs.com) + teselas de [OpenStreetMap](https://www.openstreetmap.org) |
| Sin conexión | Service Worker + `localStorage` (aplicación instalable o PWA) |

Las únicas dependencias son `express` y `leaflet`.

## Instalación y ejecución

**Requisito:** [Node.js](https://nodejs.org) 22.13 o superior.

```bash
git clone https://github.com/cordobapalacionc-dotcom/metodologia.git
cd metodologia/backend
npm install
npm start
```

Luego abrir **http://localhost:3000**.

La base de datos (`backend/datos/quibdo.db`) se crea sola la primera vez, con los cursos, recursos, oportunidades y puntos de ejemplo.

| Comando (dentro de `backend/`) | Descripción |
|---|---|
| `npm start` | Inicia el servidor. |
| `npm run dev` | Inicia el servidor y lo reinicia al guardar cambios. |
| `npm run admin -- correo@ejemplo.com` | Convierte en administrador a un usuario ya registrado. |

Variables de entorno opcionales:

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor. |
| `RUTA_DB` | `backend/datos/quibdo.db` | Ubicación del archivo de base de datos. |
| `NODE_ENV` | — | Con `production`, la cookie de sesión solo viaja por HTTPS. |

## Primer administrador

1. Iniciar el servidor y **registrarse** desde la página principal.
2. En otra terminal, dentro de `backend/`:
   ```bash
   npm run admin -- tu-correo@ejemplo.com
   ```
3. Volver a entrar: aparecerá el botón **Admin** en el encabezado.

Desde el panel se pueden nombrar más administradores.

## Estructura del proyecto

```
metodologia/
├── backend/
│   ├── src/
│   │   ├── server.js          # Servidor Express: API, archivos del frontend y cabeceras de seguridad
│   │   ├── config.js          # Puerto, ruta de la base de datos
│   │   ├── db.js              # Tablas SQLite y migraciones
│   │   ├── semilla.js         # Contenido inicial
│   │   ├── autenticacion.js   # Contraseñas (scrypt) y sesiones (cookie HttpOnly)
│   │   ├── utilidades.js      # Validaciones, límites de intentos, conversión de texto a HTML seguro
│   │   └── rutas/             # Un archivo por sección de la API
│   │       ├── auth.js  cursos.js  puntos.js  recursos.js  oportunidades.js
│   │       └── diagnosticos.js  certificados.js  perfil.js  admin.js
│   └── scripts/crear-admin.js
└── frontend/
    ├── index.html             # Iniciar sesión / registrarse
    ├── inicio.html  aula.html  conectividad.html  recursos.html
    ├── oportunidades.html  diagnostico.html  perfil.html
    ├── certificado.html  admin.html
    ├── css/                   # base.css + un archivo por página
    ├── js/
    │   ├── api.js             # Cliente de la API
    │   ├── comun.js           # Encabezado, navegación, sesión, avisos
    │   ├── cola.js            # Diagnósticos pendientes sin conexión
    │   ├── analisis.js        # Análisis del diagnóstico (compartido con el backend)
    │   └── <página>.js        # Lógica de cada página
    ├── img/                   # iconos.svg (sprite), logo.svg
    ├── manifest.webmanifest
    └── sw.js                  # Service Worker
```

## API

Todas las rutas empiezan por `/api`. La sesión viaja en una cookie `HttpOnly`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/registro` | público | Crear cuenta |
| POST | `/auth/login` | público | Iniciar sesión |
| POST | `/auth/logout` | sesión | Cerrar sesión |
| GET | `/auth/yo` | sesión | Usuario actual |
| GET | `/cursos` | público | Cursos (con avance si hay sesión) |
| GET | `/cursos/:id` | público | Curso con lecciones (sin las respuestas correctas) |
| GET | `/cursos/progreso` | sesión | Resumen de avance |
| POST | `/cursos/lecciones/:id/responder` | público | Corregir una respuesta (el avance se guarda si hay sesión) |
| GET | `/puntos` | público | Puntos del mapa |
| POST | `/puntos` | sesión | Reportar un punto (queda pendiente de verificación) |
| GET | `/recursos` | público | Lista de guías |
| GET | `/recursos/:id/descargar` | público | Descargar una guía |
| GET | `/oportunidades` | público | Oportunidades (`?tipo=Beca`) |
| PUT / DELETE | `/oportunidades/:id/guardada` | sesión | Guardar o quitar una oportunidad |
| POST | `/diagnosticos` | público | Enviar un diagnóstico (`paraOtraPersona`, `fechaLocal` opcionales) |
| GET | `/diagnosticos/mio` | sesión | Último diagnóstico propio |
| GET | `/diagnosticos/estadisticas` | público | Estadísticas anónimas |
| GET | `/diagnosticos/exportar` | admin | CSV completo |
| POST | `/certificados` | sesión | Emitir el certificado de un curso terminado |
| GET | `/certificados/mios` | sesión | Mis certificados |
| GET | `/certificados/:codigo` | público | Verificar un certificado |
| GET / PUT | `/perfil` | sesión | Mi actividad / editar mis datos |
| PUT | `/perfil/clave` | sesión | Cambiar contraseña |
| * | `/admin/...` | admin | Resumen, puntos, cursos, lecciones, oportunidades y usuarios |

## Funcionamiento sin conexión

La plataforma está pensada para conexiones intermitentes:

- **Páginas, estilos e iconos** se guardan en el dispositivo después de la primera visita.
- **Contenido de la API** (cursos, oportunidades, estadísticas…): se pide primero a la red y, si no hay conexión, se usa la última copia guardada.
- **Mapa:** las teselas ya vistas se guardan, hasta 600.
- **Diagnósticos:** si no hay señal, se guardan en el dispositivo, el resultado se calcula ahí mismo y se envían solos al volver la conexión.
- La plataforma se puede **instalar** en el celular desde el menú del navegador ("Agregar a pantalla de inicio").

## Seguridad

- Las contraseñas se guardan con `scrypt` y una sal aleatoria; nunca en texto plano.
- La sesión usa un token aleatorio en una cookie `HttpOnly` y `SameSite=Lax`; en la base de datos solo se guarda su hash.
- Al cambiar la contraseña se cierran las demás sesiones.
- Límite de intentos en el inicio de sesión, el registro y los reportes.
- Cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`, `nosniff`).
- Validación de todos los datos en el servidor.
- Las respuestas correctas de las lecciones nunca se envían al navegador.
- El contenido que escriben los administradores se convierte a HTML **escapando** todo, para evitar inyección de código.
- La base de datos (`backend/datos/`) está en `.gitignore`: **no se sube al repositorio**.

## Limitaciones del prototipo

- **Los puntos del mapa son datos de ejemplo** con ubicaciones aproximadas. Deben reemplazarse por información verificada (Alcaldía, MinTIC, trabajo de campo), lo cual se puede hacer desde el panel de administración.
- **Las oportunidades enlazan a las páginas generales de cada entidad.** Las fechas y los requisitos deben consultarse en la fuente oficial.
- **Teselas del mapa:** la [política de uso de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) no permite usar sus servidores a gran escala. Para un despliegue real conviene contratar un proveedor de mapas o montar un servidor propio de teselas.
- **No hay recuperación de contraseña** por correo o SMS.
- El límite de intentos se guarda en memoria, así que solo sirve con un único servidor.
- Los certificados son **de participación** y no equivalen a un título académico oficial.

## Próximos pasos

- Recuperación de contraseña por correo o SMS.
- Lecciones con audio, para personas con dificultades de lectura.
- Validación en campo de los puntos de conectividad junto con la comunidad.
- Despliegue en un servidor con HTTPS y copias de seguridad de la base de datos.
- Mapa base guardado para toda la ciudad, para usarlo sin conexión.
