/**
 * Cola de diagnósticos guardados sin conexión.
 * Se guardan en el dispositivo y se envían solos cuando vuelve la señal.
 */
import { api } from './api.js';

const CLAVE = 'qc_diag_pendientes';
let sincronizando = false;

export function pendientes() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { return []; }
}

const guardarLista = lista => localStorage.setItem(CLAVE, JSON.stringify(lista));

/** Guarda un diagnóstico para enviarlo después. */
export function encolar(datos, usuario) {
  const lista = pendientes();
  lista.push({ ...datos, fechaLocal: new Date().toISOString(), correo: usuario?.correo ?? null });
  guardarLista(lista);
  return lista.length;
}

/**
 * Envía los diagnósticos pendientes. Devuelve cuántos se enviaron.
 * Si quien está conectado ahora no es quien lo respondió, se envía como anónimo.
 */
export async function sincronizar(usuario) {
  if (sincronizando || !navigator.onLine) return 0;
  const lista = pendientes();
  if (!lista.length) return 0;
  sincronizando = true;
  let enviados = 0;
  const restantes = [];
  try {
    for (const item of lista) {
      const { correo, ...datos } = item;
      if (correo !== (usuario?.correo ?? null)) datos.paraOtraPersona = true;
      try {
        await api('/diagnosticos', { metodo: 'POST', datos });
        enviados++;
      } catch (e) {
        // Sin conexión, error del servidor o límite: se reintenta después.
        // Datos inválidos (400): se descartan para no bloquear la cola.
        if (e.estado === 0 || e.estado === 429 || e.estado >= 500) restantes.push(item);
      }
    }
    guardarLista(restantes);
  } finally {
    sincronizando = false;
  }
  if (enviados) dispatchEvent(new CustomEvent('qc:sincronizado', { detail: { enviados, restantes: restantes.length } }));
  return enviados;
}
