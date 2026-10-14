/**
 * Convierte el Markdown sencillo de los documentos legales en bloques que React pinta como texto.
 * No genera HTML (nada de dangerouslySetInnerHTML): así no hay riesgo de XSS aunque el archivo cambie.
 * Soporta solo lo que usa docs/legal: títulos (#), citas (>), listas (-) y párrafos.
 */
export type Bloque =
  | { tipo: 'titulo'; nivel: 1 | 2; texto: string }
  | { tipo: 'cita'; texto: string }
  | { tipo: 'lista'; elementos: string[] }
  | { tipo: 'parrafo'; texto: string }

const sinMarcas = (texto: string) => texto.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').trim()

export function aBloques(markdown: string): Bloque[] {
  const bloques: Bloque[] = []
  for (const parrafo of markdown.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lineas = parrafo.split('\n').filter((l) => l.trim() !== '')
    const primera = lineas[0]
    if (!primera) continue
    if (/^#{1,2} /.test(primera)) {
      bloques.push({ tipo: 'titulo', nivel: primera.startsWith('## ') ? 2 : 1, texto: sinMarcas(primera.replace(/^#+ /, '')) })
    } else if (lineas.every((l) => l.startsWith('>'))) {
      bloques.push({ tipo: 'cita', texto: sinMarcas(lineas.map((l) => l.replace(/^>\s?/, '')).join(' ')) })
    } else {
      bloques.push(...parrafosYListas(lineas))
    }
  }
  return bloques
}

/** Un bloque puede mezclar texto y una lista sin línea en blanco entre ellos ("Datos:\n- uno"). */
function parrafosYListas(lineas: string[]): Bloque[] {
  const bloques: Bloque[] = []
  for (const linea of lineas) {
    const anterior = bloques.at(-1)
    if (linea.startsWith('- ')) {
      const elemento = sinMarcas(linea.slice(2))
      if (anterior?.tipo === 'lista') anterior.elementos.push(elemento)
      else bloques.push({ tipo: 'lista', elementos: [elemento] })
    } else if (anterior?.tipo === 'parrafo') {
      anterior.texto = `${anterior.texto} ${sinMarcas(linea)}`
    } else {
      bloques.push({ tipo: 'parrafo', texto: sinMarcas(linea) })
    }
  }
  return bloques
}
