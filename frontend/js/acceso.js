/** Página de acceso: iniciar sesión y registrarse. */
import { api } from './api.js';
import { $, $$, ico, esc, obtenerUsuario, recordarUsuario, registrarServiceWorker } from './comun.js';

registrarServiceWorker();

// Si ya hay sesión, ir directo al inicio
if (await obtenerUsuario()) location.replace('/inicio');

/* ---------- Pestañas ---------- */
function mostrar(cual) {
  const login = cual === 'login';
  $('#tabLogin').setAttribute('aria-selected', login);
  $('#tabRegistro').setAttribute('aria-selected', !login);
  $('#formLogin').hidden = !login;
  $('#formRegistro').hidden = login;
  $('#errLogin').innerHTML = $('#errRegistro').innerHTML = '';
  (login ? $('#logCorreo') : $('#regNombre')).focus();
}
$('#tabLogin').addEventListener('click', () => mostrar('login'));
$('#tabRegistro').addEventListener('click', () => mostrar('registro'));
if (new URLSearchParams(location.search).has('registro')) mostrar('registro');

/* ---------- Mostrar / ocultar contraseña ---------- */
$$('.ver-clave').forEach(b => b.addEventListener('click', () => {
  const input = $('#' + b.dataset.para);
  const ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  b.innerHTML = ico(ver ? 'ojo-off' : 'ojo');
  b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
}));

/* ---------- Fuerza de la contraseña ---------- */
$('#regClave').addEventListener('input', e => {
  const v = e.target.value;
  let p = 0;
  if (v.length >= 6) p++;
  if (v.length >= 10) p++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) p++;
  if (/\d/.test(v)) p++;
  if (/[^\w]/.test(v)) p++;
  const [txt, color] = [['', ''], ['Débil', '#dc2626'], ['Débil', '#dc2626'], ['Aceptable', '#f2b705'], ['Buena', '#16a34a'], ['Muy segura', '#0f5132']][p];
  $('#fuerzaBarra').style.width = `${p / 5 * 100}%`;
  $('#fuerzaBarra').style.background = color;
  $('#fuerzaTxt').textContent = v ? `Seguridad: ${txt}` : '';
});

const error = (sel, txt) => { $(sel).innerHTML = ico('alerta') + ' ' + esc(txt); };

async function enviar(form, sel, fn) {
  const boton = $('button[type=submit]', form);
  boton.disabled = true;
  $(sel).innerHTML = '';
  try {
    const { usuario } = await fn();
    recordarUsuario(usuario);
    location.href = '/inicio';
  } catch (e) {
    error(sel, e.message);
    boton.disabled = false;
  }
}

/* ---------- Iniciar sesión ---------- */
$('#formLogin').addEventListener('submit', e => {
  e.preventDefault();
  const correo = $('#logCorreo').value.trim(), clave = $('#logClave').value;
  if (!correo || !clave) return error('#errLogin', 'Escribe tu correo y contraseña.');
  enviar(e.target, '#errLogin', () =>
    api('/auth/login', { metodo: 'POST', datos: { correo, clave, recordar: $('#logRecordar').checked } }));
});

/* ---------- Registrarse ---------- */
$('#formRegistro').addEventListener('submit', e => {
  e.preventDefault();
  const datos = {
    nombre: $('#regNombre').value.trim(),
    correo: $('#regCorreo').value.trim(),
    perfil: $('#regPerfil').value,
    barrio: $('#regBarrio').value.trim(),
    clave: $('#regClave').value,
    aceptaDatos: $('#regTerminos').checked,
  };
  if (datos.nombre.length < 3) return error('#errRegistro', 'Escribe tu nombre completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo)) return error('#errRegistro', 'El correo electrónico no es válido.');
  if (!datos.perfil) return error('#errRegistro', 'Selecciona tu perfil.');
  if (datos.clave.length < 6) return error('#errRegistro', 'La contraseña debe tener al menos 6 caracteres.');
  if (datos.clave !== $('#regClave2').value) return error('#errRegistro', 'Las contraseñas no coinciden.');
  if (!datos.aceptaDatos) return error('#errRegistro', 'Debes aceptar el tratamiento de datos.');
  enviar(e.target, '#errRegistro', () => api('/auth/registro', { metodo: 'POST', datos }));
});

/* ---------- Invitado ---------- */
$('#btnInvitado').addEventListener('click', () => {
  sessionStorage.setItem('qc_invitado', '1');
  location.href = '/inicio';
});
