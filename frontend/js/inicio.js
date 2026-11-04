/** Página de inicio: saludo, progreso y accesos. */
import { api } from './api.js';
import { $, ico, esc, iniciarPagina } from './comun.js';

const usuario = await iniciarPagina();

if (usuario) {
  $('#saludo').textContent = `¡Hola, ${usuario.nombre.split(' ')[0]}!`;
  try {
    const [p, mio] = await Promise.all([api('/cursos/progreso'), api('/diagnosticos/mio')]);
    const pct = p.total ? Math.round(p.hechas / p.total * 100) : 0;
    $('#barraGlobal').style.width = pct + '%';
    $('#resumenProgreso').textContent = p.hechas
      ? `Has completado ${p.hechas} de ${p.total} lecciones y ${p.terminados} de ${p.cursos} cursos.`
      : 'Aún no has iniciado ningún curso. ¡Empieza hoy con una lección de 5 minutos!';
    $('#resumenDiag').innerHTML = mio.diagnostico
      ? `${ico('grafica')} Tu perfil digital: <b>${esc(mio.resultado.perfil)}</b>`
      : `${ico('grafica')} Aún no has hecho tu diagnóstico digital.`;
  } catch (e) {
    $('#resumenProgreso').textContent = e.message;
  }
  api('/certificados/mios').then(certs => {
    if (!certs.length) return;
    $('#misCertificados').hidden = false;
    $('#listaCertificados').innerHTML = certs.map(c => `
      <a class="card certificado-mini" href="/certificado?codigo=${encodeURIComponent(c.codigo)}">
        <div class="ico-caja oro" style="margin:0">${ico('birrete', 'ico-grande')}</div>
        <div><b>${esc(c.curso_titulo)}</b><small>${new Date(c.fecha.replace(' ', 'T') + 'Z').toLocaleDateString('es-CO')} · ${esc(c.codigo)}</small></div>
      </a>`).join('');
  }).catch(() => {});
} else {
  $('#tarjetaProgreso').innerHTML = `
    <h3>${ico('usuario')} Estás como invitado</h3>
    <p>Puedes explorar todo, pero tu avance no se guardará. Crea una cuenta gratis para guardar tus cursos, oportunidades y diagnóstico.</p>
    <a class="btn" href="/?registro">${ico('usuario-mas')} Crear cuenta</a>`;
}
