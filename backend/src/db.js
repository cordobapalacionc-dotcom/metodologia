import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { RUTA_DB, ADMIN_CORREOS } from './config.js';
import { sembrar } from './semilla.js';

fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });

export const db = new DatabaseSync(RUTA_DB);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const columnas = tabla => db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);

// Migración: el mapa pasó de coordenadas x/y (esquema) a latitud/longitud reales
if (columnas('puntos').includes('x')) db.exec('DROP TABLE puntos');

const TABLA_USUARIOS = `CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  correo      TEXT NOT NULL UNIQUE,
  perfil      TEXT NOT NULL,
  barrio      TEXT,
  clave_hash  TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','facilitador','admin')),
  creado      TEXT NOT NULL DEFAULT (datetime('now'))
)`;

db.exec(`
${TABLA_USUARIOS};

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cursos (
  id       TEXT PRIMARY KEY,
  titulo   TEXT NOT NULL,
  icono    TEXT,
  color    TEXT,
  nivel    TEXT,
  publico  TEXT,
  orden    INTEGER,
  autor_id       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- facilitador que lo creó (NULL = curso de la plataforma)
  codigo_acceso  TEXT          -- NULL = abierto a todos · con código = curso privado de un grupo
);

CREATE TABLE IF NOT EXISTS lecciones (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_id   TEXT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  orden      INTEGER NOT NULL,
  titulo     TEXT NOT NULL,
  contenido  TEXT NOT NULL,
  pregunta   TEXT NOT NULL,
  opciones   TEXT NOT NULL,      -- JSON: ["a","b","c"]
  respuesta  INTEGER NOT NULL,   -- índice de la opción correcta (nunca se envía al cliente)
  fuente     TEXT,               -- texto editable desde el panel (el HTML se genera a partir de él)
  UNIQUE (curso_id, orden)
);

CREATE TABLE IF NOT EXISTS progreso (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leccion_id  INTEGER NOT NULL REFERENCES lecciones(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, leccion_id)
);

CREATE TABLE IF NOT EXISTS puntos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('wifi','comunitario','zona')),
  lat            REAL NOT NULL,
  lng            REAL NOT NULL,
  radio          REAL,             -- metros (solo zonas)
  horario        TEXT,
  senal          TEXT,
  descripcion    TEXT,
  reportado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  verificado     INTEGER NOT NULL DEFAULT 1,
  creado         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recursos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo     TEXT NOT NULL,
  tipo       TEXT,
  tema       TEXT,
  icono      TEXT,
  extension  TEXT NOT NULL DEFAULT 'txt',
  contenido  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS descargas (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  recurso_id  INTEGER NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, recurso_id)
);

CREATE TABLE IF NOT EXISTS oportunidades (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo       TEXT NOT NULL,
  tipo         TEXT NOT NULL,
  entidad      TEXT,
  descripcion  TEXT,
  url          TEXT
);

CREATE TABLE IF NOT EXISTS guardadas (
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  oportunidad_id  INTEGER NOT NULL REFERENCES oportunidades(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, oportunidad_id)
);

CREATE TABLE IF NOT EXISTS diagnosticos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha         TEXT NOT NULL DEFAULT (datetime('now')),
  perfil        TEXT,
  edad          TEXT NOT NULL,
  dispositivos  TEXT NOT NULL,   -- JSON
  internet      TEXT NOT NULL,
  calidad       TEXT NOT NULL,
  frecuencia    TEXT NOT NULL,
  nivel         INTEGER NOT NULL,
  dificultades  TEXT NOT NULL,   -- JSON
  barrio        TEXT
);

-- Sin llave foránea a cursos: el certificado sigue siendo válido aunque el curso se borre
CREATE TABLE IF NOT EXISTS certificados (
  codigo        TEXT PRIMARY KEY,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id      TEXT NOT NULL,
  curso_titulo  TEXT NOT NULL,
  lecciones     INTEGER NOT NULL,
  fecha         TEXT NOT NULL DEFAULT (datetime('now')),
  facilitador   TEXT,          -- nombre de quien dictó el curso (cursos de grupo)
  UNIQUE (usuario_id, curso_id)
);

-- Estudiantes inscritos en los cursos privados de un facilitador
CREATE TABLE IF NOT EXISTS inscripciones (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id    TEXT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, curso_id)
);

-- Códigos de recuperación de contraseña (los entrega un admin o el facilitador; en la BD solo va su hash)
CREATE TABLE IF NOT EXISTS recuperaciones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash  TEXT NOT NULL,
  creado_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado       TEXT NOT NULL DEFAULT (datetime('now')),
  expira       TEXT NOT NULL,
  intentos     INTEGER NOT NULL DEFAULT 0,
  usado        TEXT
);
`);

// Migraciones para bases creadas con versiones anteriores
if (!columnas('lecciones').includes('fuente')) db.exec('ALTER TABLE lecciones ADD COLUMN fuente TEXT');
if (!columnas('cursos').includes('autor_id'))
  db.exec('ALTER TABLE cursos ADD COLUMN autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL');
if (!columnas('cursos').includes('codigo_acceso')) db.exec('ALTER TABLE cursos ADD COLUMN codigo_acceso TEXT');
if (!columnas('certificados').includes('facilitador')) db.exec('ALTER TABLE certificados ADD COLUMN facilitador TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS cursos_codigo ON cursos(codigo_acceso)');

// El rol "facilitador" no cabía en la restricción CHECK anterior. SQLite no permite cambiar un CHECK,
// así que se reconstruye la tabla siguiendo el procedimiento oficial de SQLite.
const sqlUsuarios = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'").get().sql;
if (!sqlUsuarios.includes("'facilitador'")) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    db.exec(TABLA_USUARIOS.replace('IF NOT EXISTS usuarios', 'usuarios_nueva'));
    db.exec('INSERT INTO usuarios_nueva (id, nombre, correo, perfil, barrio, clave_hash, rol, creado) ' +
            'SELECT id, nombre, correo, perfil, barrio, clave_hash, rol, creado FROM usuarios');
    db.exec('DROP TABLE usuarios');
    db.exec('ALTER TABLE usuarios_nueva RENAME TO usuarios');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Migración de usuarios: llaves foráneas rotas.');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

/** Ejecuta fn dentro de una transacción. */
export function transaccion(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Limpia sesiones vencidas al arrancar
db.prepare('DELETE FROM sesiones WHERE expira <= ?').run(new Date().toISOString());

sembrar(db, transaccion);

// Administradores definidos por la variable de entorno ADMIN_CORREOS (útil en hosting sin terminal)
const hacerAdmin = db.prepare("UPDATE usuarios SET rol = 'admin' WHERE correo = ?");
for (const correo of ADMIN_CORREOS) hacerAdmin.run(correo);
