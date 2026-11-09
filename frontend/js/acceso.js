/** Página de acceso: iniciar sesión y registrarse. */
import { api } from './api.js';
import { $, $$, ico, esc, obtenerUsuario, recordarUsuario, registrarServiceWorker } from './comun.js';

registrarServiceWorker();

/** Adónde ir después de entrar: si llegó con una invitación a un curso, al aula para unirse. */
const params = new URLSearchParams(location.search);
const destino = () => params.get('unirse') ? `/aula?unirse=${encodeURIComponent(params.get('unirse'))}` : '/inicio';

// Si ya hay sesión, ir directo
if (await obtenerUsuario()) location.replace(destino());

/* ---------- Pestañas: login · registro · recuperar ---------- */
function mostrar(cual) {
  $('#tabLogin').setAttribute('aria-selected', cual !== 'registro');
  $('#tabRegistro').setAttribute('aria-selected', cual === 'registro');
  $('#formLogin').hidden = cual !== 'login';
  $('#formRegistro').hidden = cual !== 'registro';
  $('#formRecuperar').hidden = cual !== 'recuperar';
  $('#errLogin').innerHTML = $('#errRegistro').innerHTML = $('#errRecuperar').innerHTML = '';
  ({ login: $('#logCorreo'), registro: $('#regNombre'), recuperar: $('#recCorreo') })[cual].focus();
}
$('#tabLogin').addEventListener('click', () => mostrar('login'));
$('#tabRegistro').addEventListener('click', () => mostrar('registro'));
$('#btnOlvide').addEventListener('click', () => {
  $('#recCorreo').value = $('#logCorreo').value.trim();
  mostrar('recuperar');
});
$('#btnVolverLogin').addEventListener('click', () => mostrar('login'));
if (params.has('registro')) mostrar('registro');
if (params.has('recuperar')) mostrar('recuperar');
if (params.get('unirse')) $('#avisoInvitacion').hidden = false;

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
    location.href = destino();
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

/* ---------- Recuperar la contraseña ---------- */
$('#formRecuperar').addEventListener('submit', e => {
  e.preventDefault();
  const datos = {
    correo: $('#recCorreo').value.trim(),
    codigo: $('#recCodigo').value.trim(),
    clave: $('#recClave').value,
  };
  if (!datos.correo) return error('#errRecuperar', 'Escribe el correo de tu cuenta.');
  if (datos.codigo.replace(/[\s-]/g, '').length !== 8) return error('#errRecuperar', 'El código tiene 8 letras y números, por ejemplo ABCD-EFGH.');
  if (datos.clave.length < 6) return error('#errRecuperar', 'La contraseña nueva debe tener al menos 6 caracteres.');
  if (datos.clave !== $('#recClave2').value) return error('#errRecuperar', 'Las contraseñas no coinciden.');
  enviar(e.target, '#errRecuperar', () => api('/auth/recuperar', { metodo: 'POST', datos }));
});

/* ---------- Invitado ---------- */
$('#btnInvitado').addEventListener('click', () => {
  sessionStorage.setItem('qc_invitado', '1');
  location.href = '/inicio';
});
