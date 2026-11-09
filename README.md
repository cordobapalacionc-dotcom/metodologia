# Quibdó Conecta

**Plataforma de inclusión digital para Quibdó (Chocó, Colombia)**: aprender, conectarse y encontrar oportunidades, incluso con poca señal.

Quibdó Conecta reúne en un solo lugar formación digital básica, información de conectividad, recursos para estudiar sin Internet, oportunidades de estudio y empleo, y un diagnóstico que permite conocer la situación digital de cada persona y de la comunidad. Está pensada para celulares sencillos y conexiones inestables.

---

## Tabla de contenido

- [El problema](#el-problema)
- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Despliegue en Render](#despliegue-en-render)
- [Base de datos en Supabase](#base-de-datos-en-supabase)
- [Primer administrador](#primer-administrador)
- [Roles](#roles)
- [Recuperar una contraseña](#recuperar-una-contraseña)
- [Copias de seguridad](#copias-de-seguridad)
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
| **Cuenta** | Registrarse, iniciar sesión o entrar como invitado. Si se olvida la contraseña, se crea una nueva con un código que entrega el facilitador o el administrador. |
| **Aula virtual** | Cursos cortos de informática básica, Word, Excel, correo electrónico y uso seguro de Internet. Cada lección termina con una pregunta que corrige el servidor. El avance queda guardado. Con el **código de un facilitador** se entra a los cursos privados de su grupo. |
| **Certificados** | Al completar un curso se emite un certificado de participación con **código de verificación público** y **código QR**, descargable en PDF. En los cursos de grupo aparece el nombre del facilitador. |
| **Mapa de conectividad** | Mapa real (OpenStreetMap) con puntos de Wi-Fi gratuito, sitios de acceso comunitario y zonas con mala señal. Incluye *Mi ubicación*, el punto más cercano y *Cómo llegar*. La comunidad puede **reportar** puntos nuevos tocando el mapa. |
| **Banco de recursos** | Guías y plantillas muy livianas (menos de 5 KB) para descargar y leer sin Internet. |
| **Oportunidades** | Becas, cursos gratuitos, empleo, convocatorias y emprendimiento, con enlace a la fuente oficial. Se pueden guardar. |
| **Diagnóstico digital** | Un formulario de 7 preguntas que da un puntaje de acceso y de habilidades, una ruta de cursos recomendada y consejos. Funciona **sin conexión**: se guarda en el dispositivo y se envía al volver la señal. |
| **Mi panel** | Avance por curso, certificados, evolución de los diagnósticos, actividad reciente, oportunidades guardadas, descargas y reportes. Permite editar los datos y cambiar la contraseña. |

### Para jornadas de campo

- **Modo jornada:** una persona promotora puede registrar diagnósticos de otras personas desde su celular, incluso sin señal. Se guardan de forma anónima y se sincronizan después.
- **Panel de la comunidad:** estadísticas anónimas sobre acceso, dificultades, tipo de conexión y barrios.

### Para facilitadores (`/facilitador`)

Docentes y líderes comunitarios que acompañan a un grupo:

- Crean **cursos privados** para su grupo, con lecciones y preguntas, en texto sencillo.
- Cada curso tiene un **código de invitación** de 6 caracteres. Se comparte con un enlace (`/aula?unirse=CÓDIGO`) o por WhatsApp, y se puede cambiar cuando se quiera.
- Ven a sus **estudiantes**: avance, última actividad y certificado.
- Generan un **código de recuperación de contraseña** para sus estudiantes.

### Para administradores (`/admin`)

- Resumen general de la plataforma.
- **Tablero de impacto** para aliados (Alcaldía, Gobernación, SENA, MinTIC): personas registradas, formadas y certificadas; finalización de cursos; evolución de los últimos 12 meses; resultados por barrio, perfil y curso; lo que dice el diagnóstico de la comunidad. Se puede imprimir en PDF o descargar en CSV para Excel.
- Revisión de los reportes del mapa: aprobar, corregir o eliminar.
- Creación y edición de cursos y lecciones (en texto sencillo).
- Publicación de oportunidades.
- Gestión de roles (usuario, facilitador, administrador) y códigos de recuperación de contraseña.
- **Copias de seguridad**: automáticas cada 24 horas, manuales con un botón y descargables.
- Exportación de los diagnósticos a CSV para análisis.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Servidor | [Node.js](https://nodejs.org) 22.13 o superior + [Express 5](https://expressjs.com) |
| Base de datos | [PostgreSQL](https://www.postgresql.org) en [Supabase](https://supabase.com) (plan gratuito), con la librería `pg` |
| Frontend | HTML, CSS y JavaScript sin frameworks, con módulos ES |
| Mapa | [Leaflet](https://leafletjs.com) + teselas de [OpenStreetMap](https://www.openstreetmap.org) |
| Código QR | [qrcode](https://www.npmjs.com/package/qrcode), generado en el servidor como SVG |
| Sin conexión | Service Worker + `localStorage` (aplicación instalable o PWA) |

Las únicas dependencias son `express`, `leaflet` y `qrcode`.

## Instalación y ejecución

**Requisitos:** [Node.js](https://nodejs.org) 22.13 o superior y una base de datos PostgreSQL: la de un proyecto de [Supabase](https://supabase.com) (ver [Base de datos en Supabase](#base-de-datos-en-supabase)) o una instalada en el equipo.

```bash
git clone https://github.com/cordobapalacionc-dotcom/metodologia.git
cd metodologia/backend
npm install
npm start
```

Luego abrir **http://localhost:3000**.

Antes de `npm start`, definir la variable `DATABASE_URL` con la cadena de conexión, por ejemplo en PowerShell `$env:DATABASE_URL="postgresql://..."` o en Linux/macOS `export DATABASE_URL="postgresql://..."`. Las tablas se crean solas la primera vez, con los cursos, recursos, oportunidades y puntos de ejemplo.

| Comando (dentro de `backend/`) | Descripción |
|---|---|
| `npm start` | Inicia el servidor. |
| `npm run dev` | Inicia el servidor y lo reinicia al guardar cambios. |
| `npm run admin -- correo@ejemplo.com` | Convierte en administrador a un usuario ya registrado. |
| `npm run copia` | Crea una copia de seguridad ahora y la guarda también como archivo `.json`. |
| `npm run restaurar` | Lista las copias. Con `-- nombre` o `-- archivo.json` restaura una. |
| `npm run migrar` | Pasa los datos de la base SQLite anterior (`backend/datos/quibdo.db`) a PostgreSQL. |

Variables de entorno opcionales:

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor. |
| `DATABASE_URL` | — | **Obligatoria.** Cadena de conexión de PostgreSQL (Supabase). |
| `RUTA_DB` | `backend/datos/quibdo.db` | Base SQLite anterior; solo la usa `npm run migrar`. |
| `NODE_ENV` | — | Con `production`, la cookie de sesión solo viaja por HTTPS. |
| `ADMIN_CORREOS` | — | Correos (separados por comas) que quedan como administradores. |
| `TRUST_PROXY` | — | Con `1`, usa la IP real detrás de un proxy (en Render se activa sola). |
| `URL_PUBLICA` | — | Dirección pública del sitio (p. ej. `https://quibdoconecta.co`). Es la que lleva el QR de los certificados. **Recomendada en producción**; si falta, se usa la dirección con la que se abrió el sitio. |
| `HORAS_ENTRE_COPIAS` | `24` | Cada cuántas horas se hace una copia automática. |
| `COPIAS_MAX` | `30` | Cuántas copias se conservan; las más antiguas se borran. |

## Despliegue en Render

El repositorio incluye un Blueprint (`render.yaml`) que crea un servicio web con Node.js. El mismo servidor Express sirve la API y el frontend.

1. Abrir: **https://dashboard.render.com/blueprint/new?repo=https://github.com/cordobapalacionc-dotcom/metodologia**
2. Conectar la cuenta de GitHub si Render lo pide.
3. Escribir en `ADMIN_CORREOS` el correo de la persona administradora (varios, separados por comas) y en `DATABASE_URL` la cadena de conexión de Supabase.
4. Pulsar **Apply**. Al terminar, la plataforma queda en `https://quibdo-conecta.onrender.com` (o un nombre parecido).
5. Registrarse con ese correo: la cuenta queda como administradora de una vez (no hace falta terminal).

> **Plan gratuito de Render:** el servicio se duerme tras 15 minutos sin visitas (la primera carga tarda ~1 minuto). Los datos **no** se pierden, porque viven en Supabase. Sin `DATABASE_URL` el servidor no arranca.

## Base de datos en Supabase

1. Crear una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (**New project**). Elegir una región cercana (p. ej. *East US*) y **guardar la contraseña** de la base de datos.
2. En el proyecto, pulsar **Connect** (arriba) y copiar la cadena de la sección **Session pooler**. Se ve así:
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
3. Reemplazar `[YOUR-PASSWORD]` por la contraseña del paso 1. Esa es la `DATABASE_URL`.
   Usar el **Session pooler** y no la conexión directa: la directa solo funciona con IPv6 y Render usa IPv4.
4. En Render: servicio **quibdo-conecta → Environment → Add Environment Variable**, clave `DATABASE_URL`, pegar el valor y guardar. Render vuelve a publicar el sitio.
5. Al arrancar, el servidor crea las tablas y el contenido de ejemplo. Se pueden ver en Supabase, en **Table Editor**.

**Pasar los datos de la versión anterior (SQLite).** Si ya se usó la plataforma con SQLite en un computador (por ejemplo, para conservar la cuenta de administrador), en ese computador, dentro de `backend/`:

```bash
npm install
```

y luego, con la misma `DATABASE_URL`:

```bash
npm run migrar
```

Pasa usuarios (con sus contraseñas), avance, certificados, diagnósticos, puntos, cursos, recursos y oportunidades. Si la base de Supabase ya tiene usuarios, el comando se detiene; para reemplazarlo todo se agrega `-- --reemplazar` (antes guarda una copia de lo que había).

## Primer administrador

1. Iniciar el servidor y **registrarse** desde la página principal.
2. En otra terminal, dentro de `backend/`:
   ```bash
   npm run admin -- tu-correo@ejemplo.com
   ```
3. Volver a entrar: aparecerá el botón **Admin** en el encabezado.

Desde el panel se pueden nombrar más administradores y facilitadores.

## Roles

| Rol | Puede |
|---|---|
| **Usuario** | Usar todas las secciones, unirse a cursos de grupo con un código y obtener certificados. |
| **Facilitador** | Lo anterior, más crear cursos privados para su grupo, ver el avance de sus estudiantes y darles códigos de recuperación. Solo puede tocar sus propios cursos. |
| **Administrador** | Todo: contenido, reportes del mapa, usuarios y roles, tablero de impacto y copias de seguridad. También puede tener sus propios grupos. |

El rol se cambia en **Admin → Usuarios**.

## Recuperar una contraseña

Como muchas personas no revisan el correo con frecuencia, la recuperación se hace **en persona o por WhatsApp**:

1. La persona le pide ayuda a su facilitador o a un administrador.
2. El facilitador (en **Mis grupos → Estudiantes**) o el administrador (en **Admin → Usuarios**) toca el botón del candado. Aparece un código como `ABCD-EFGH`.
3. La persona entra a la página de ingreso, toca **¿Olvidaste tu contraseña?** y escribe su correo, el código y una contraseña nueva.

El código sirve **una sola vez**, vence en **24 horas** y se anula después de 5 intentos fallidos. Al usarlo se cierran todas las sesiones abiertas de esa cuenta. Un facilitador solo puede generar códigos para estudiantes de sus grupos, nunca para otros facilitadores ni para administradores.

## Copias de seguridad

- **Automáticas:** al encender el servidor y cada hora se revisa si la última copia tiene más de 24 horas; si es así, se hace una nueva. Se guardan las 30 más recientes.
- **Manuales:** en **Admin → Copias de seguridad → Crear copia ahora**, o con `npm run copia`.
- Cada copia es una fotografía en JSON de todas las tablas (menos las sesiones), guardada en la misma base de datos, en la tabla `copias`. Se descarga como archivo `.json`.
- **Restaurar:** dentro de `backend/`, con la `DATABASE_URL` definida, ejecutar `npm run restaurar -- quibdo-AAAAMMDD-HHMMSS.json` (una copia guardada en la base) o `npm run restaurar -- ruta/archivo.json` (una copia descargada). Reemplaza **todos** los datos, pero antes **guarda una copia del estado actual**, así que se puede deshacer.
- Las copias contienen datos personales: solo los administradores pueden descargarlas. Como quedan en la misma base de datos, sirven para deshacer errores; para no perderlo todo si se pierde el proyecto de Supabase, descarga de vez en cuando una copia y guárdala en otro lugar.

## Estructura del proyecto

```
metodologia/
├── backend/
│   ├── src/
│   │   ├── server.js          # Servidor Express: API, archivos del frontend y cabeceras de seguridad
│   │   ├── config.js          # Puerto, base de datos, URL pública, copias
│   │   ├── db.js              # Conexión a PostgreSQL, transacciones y arranque
│   │   ├── esquema.sql        # Tablas de la base de datos
│   │   ├── semilla.js         # Contenido inicial
│   │   ├── autenticacion.js   # Contraseñas (scrypt) y sesiones (cookie HttpOnly)
│   │   ├── utilidades.js      # Validaciones, límites de intentos, conversión de texto a HTML seguro
│   │   ├── servicioCursos.js  # Cursos y lecciones (admin y facilitador) y quién ve cada curso
│   │   ├── impacto.js         # Cifras del tablero de impacto y su CSV
│   │   ├── copias.js          # Copias de seguridad automáticas y manuales
│   │   └── rutas/             # Un archivo por sección de la API
│   │       ├── auth.js  cursos.js  puntos.js  recursos.js  oportunidades.js
│   │       └── diagnosticos.js  certificados.js  perfil.js  admin.js  facilitador.js
│   └── scripts/               # crear-admin.js  copia.js  restaurar.js  migrar-desde-sqlite.js
└── frontend/
    ├── index.html             # Iniciar sesión / registrarse
    ├── inicio.html  aula.html  conectividad.html  recursos.html
    ├── oportunidades.html  diagnostico.html  perfil.html
    ├── certificado.html  admin.html  facilitador.html
    ├── css/                   # base.css + un archivo por página
    ├── js/
    │   ├── api.js             # Cliente de la API
    │   ├── comun.js           # Encabezado, navegación, sesión, avisos
    │   ├── cola.js            # Diagnósticos pendientes sin conexión
    │   ├── analisis.js        # Análisis del diagnóstico (compartido con el backend)
    │   ├── dialogo.js         # Ventana de diálogo de los paneles
    │   ├── editor-cursos.js   # Editor de cursos (admin y facilitador)
    │   ├── impacto.js         # Gráficas del tablero de impacto (HTML + CSS, sin librerías)
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
| POST | `/auth/recuperar` | público | Crear una contraseña nueva con un código de recuperación |
| POST | `/auth/logout` | sesión | Cerrar sesión |
| GET | `/auth/yo` | sesión | Usuario actual |
| GET | `/cursos` | público | Cursos visibles: los abiertos y los de los grupos del usuario (con avance si hay sesión) |
| POST | `/cursos/unirse` | sesión | Unirse a un curso de grupo con su código |
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
| GET | `/certificados/:codigo/qr.svg` | público | Código QR que abre la verificación |
| GET / PUT | `/perfil` | sesión | Mi actividad / editar mis datos |
| PUT | `/perfil/clave` | sesión | Cambiar contraseña |
| * | `/facilitador/...` | facilitador | Sus cursos y lecciones, código de invitación, estudiantes y códigos de recuperación |
| * | `/admin/...` | admin | Resumen, puntos, cursos, lecciones, oportunidades, usuarios, roles y códigos de recuperación |
| GET | `/admin/impacto` · `/admin/impacto.csv` | admin | Tablero de impacto (JSON o CSV) |
| GET / POST | `/admin/copias` · GET `/admin/copias/:archivo` | admin | Listar, crear y descargar copias de seguridad |

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
- Al cambiar la contraseña se cierran las demás sesiones; al restablecerla con un código, se cierran todas.
- Los códigos de recuperación se guardan como hash, sirven una vez, vencen en 24 horas y se anulan tras 5 intentos fallidos.
- Los cursos de grupo solo los ven su facilitador y quienes se unieron con el código; el código nunca aparece en la lista de cursos.
- En cada acción el servidor comprueba que el facilitador sea dueño del curso o que la persona sea de su grupo.
- Límite de intentos en el inicio de sesión, el registro, la recuperación de contraseña, la unión a cursos y los reportes.
- Cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`, `nosniff`).
- Validación de todos los datos en el servidor.
- Las respuestas correctas de las lecciones nunca se envían al navegador.
- El contenido que escriben los administradores se convierte a HTML **escapando** todo, para evitar inyección de código.
- La cadena de conexión (`DATABASE_URL`) contiene la contraseña de la base de datos: va solo en las variables de entorno, **nunca en el repositorio**. La base SQLite anterior (`backend/datos/`) sigue en `.gitignore`.

## Limitaciones del prototipo

- **Los puntos del mapa son datos de ejemplo** con ubicaciones aproximadas. Deben reemplazarse por información verificada (Alcaldía, MinTIC, trabajo de campo), lo cual se puede hacer desde el panel de administración.
- **Las oportunidades enlazan a las páginas generales de cada entidad.** Las fechas y los requisitos deben consultarse en la fuente oficial.
- **Teselas del mapa:** la [política de uso de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) no permite usar sus servidores a gran escala. Para un despliegue real conviene contratar un proveedor de mapas o montar un servidor propio de teselas.
- **La recuperación de contraseña depende de una persona** (facilitador o administrador): no hay envío automático por correo o SMS.
- El límite de intentos se guarda en memoria, así que solo sirve con un único servidor.
- Los certificados son **de participación** y no equivalen a un título académico oficial.

## Próximos pasos

- Recuperación de contraseña por correo o SMS, además de la recuperación en persona.
- Lecciones con audio, para personas con dificultades de lectura.
- Validación en campo de los puntos de conectividad junto con la comunidad.
- Despliegue en un servidor con HTTPS y envío automático de las copias de seguridad a otro lugar (nube o disco externo).
- Mapa base guardado para toda la ciudad, para usarlo sin conexión.
