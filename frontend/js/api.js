/** Error devuelto por la API. estado = 0 significa "sin conexión". */
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

/**
 * Llama a la API del backend.
 *   api('/cursos')
 *   api('/auth/login', { metodo: 'POST', datos: { correo, clave } })
 */
export async function api(ruta, { metodo = 'GET', datos } = {}) {
  let res;
  try {
    res = await fetch('/api' + ruta, {
      method: metodo,
      credentials: 'same-origin',
      headers: datos ? { 'Content-Type': 'application/json' } : {},
      body: datos ? JSON.stringify(datos) : undefined,
    });
  } catch {
    throw new ErrorApi('No hay conexión. Revisa tu Internet e inténtalo de nuevo.', 0);
  }
  const cuerpo = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new ErrorApi(cuerpo?.error || 'Ocurrió un error inesperado.', res.status);
  return cuerpo;
}
