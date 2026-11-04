/**
 * Certificado: muestra y verifica certificados por su código (página pública).
 * /certificado?codigo=QC-XXXXX-XXXXX
 */
import { api } from './api.js';
import { $, ico, esc, toast } from './comun.js';

const formatoFecha = f => new Date(f.replace(' ', 'T') + 'Z')
  .toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

async function mostrar(codigo) {
  try {
    const c = await api('/certificados/' + encodeURIComponent(codigo));
    const url = `${location.origin}/certificado?codigo=${encodeURIComponent(c.codigo)}`;
    $('#certNombre').textContent = c.nombre;
    $('#certCurso').textContent = c.curso_titulo;
    $('#certDetalle').textContent = `${c.lecciones} lecciones · Expedido el ${formatoFecha(c.fecha)}`;
    $('#certCodigo').textContent = c.codigo;
    $('#certUrl').textContent = url.replace(/^https?:\/\//, '');
    document.title = `Certificado ${c.curso_titulo} · ${c.nombre}`;
    $('#certificado').hidden = false;
    $('#verificar').hidden = true;
    $('#btnImprimir').hidden = false;
    $('#btnCopiar').hidden = false;
    $('#btnCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado. Compártelo para que verifiquen tu certificado.'); }
      catch { toast(url); }
    };
    history.replaceState(null, '', `?codigo=${encodeURIComponent(c.codigo)}`);
  } catch (e) {
    $('#certificado').hidden = true;
    $('#verificar').hidden = false;
    $('#errVerificar').innerHTML = `${ico('alerta')} ${esc(e.message)}`;
  }
}

$('#btnImprimir').addEventListener('click', () => window.print());

$('#formVerificar').addEventListener('submit', e => {
  e.preventDefault();
  mostrar($('#codigo').value.trim().toUpperCase());
});

const codigo = new URLSearchParams(location.search).get('codigo');
if (codigo) {
  $('#codigo').value = codigo;
  mostrar(codigo);
} else {
  $('#verificar').hidden = false;
}
