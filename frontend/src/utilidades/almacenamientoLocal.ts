/**
 * localStorage como COMODIDAD (p. ej. el borrador del código): puede no estar disponible (modo
 * privado, bloqueado), así que nunca lanza errores. Nada importante depende de esto: el progreso
 * real vive en el servidor.
 */
const PREFIJO = 'codequest:'

export function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(PREFIJO + clave)
  } catch {
    return null
  }
}

export function guardarLocal(clave: string, valor: string): void {
  try {
    localStorage.setItem(PREFIJO + clave, valor)
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}

export function borrarLocal(clave: string): void {
  try {
    localStorage.removeItem(PREFIJO + clave)
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}

/** Borra todas las claves que empiezan por `prefijo` (dentro de las de CODEQUEST). */
export function borrarConPrefijo(prefijo: string): void {
  try {
    const completo = PREFIJO + prefijo
    const claves = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    for (const clave of claves) if (clave?.startsWith(completo)) localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}
