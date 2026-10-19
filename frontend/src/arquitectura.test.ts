/**
 * Reglas de la arquitectura en capas del frontend (docs/adr/0006). Si alguien hace que una capa baja
 * dependa de una alta, esta prueba falla y dice qué archivo y qué import la rompen.
 *
 *   6 app/          enrutador, Layout, guardias (raíz de composición)
 *   5 paginas/      pantallas: componen componentes, estado y datos
 *   4 componentes/  ui/ (genéricos, sin dominio) · juego/ · editor/ · escena/
 *   3 estado/ audio/   estado de la sesión y del juego, efectos de sonido
 *   2 api/ motor/      datos del servidor · ejecución de Python (Pyodide)
 *   1 config/ textos/ utilidades/ estilos/   base sin dependencias internas
 *
 * Un archivo solo importa de su capa o de capas inferiores. Los `import type` no cuentan: se borran
 * al compilar y no crean dependencias en tiempo de ejecución.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(process.cwd(), 'src')

const NIVEL: Record<string, number> = {
  app: 6,
  paginas: 5,
  componentes: 4,
  estado: 3,
  audio: 3,
  api: 2,
  motor: 2,
  config: 1,
  textos: 1,
  utilidades: 1,
  estilos: 1,
}

/** Excepciones aceptadas, cada una con su motivo (formato "origen -> destino", rutas desde src/). */
const EXCEPCIONES: Record<string, string> = {
  // La tabla de rutas no importa nada: es el contrato de navegación que comparten las páginas.
  'paginas/* -> app/rutas': 'tabla de rutas compartida',
  // El access token vive en memoria (ADR-0003): el cliente HTTP lo lee del estado de la sesión.
  'api/cliente -> estado/sesion': 'token en memoria',
}

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.|\.d\.ts$/.test(nombre) ? [ruta] : []
  })
}

const sinExtension = (ruta: string) => ruta.replace(/\.(ts|tsx|css|md)(\?raw)?$/, '')
const aSrc = (ruta: string) => sinExtension(relative(SRC, ruta).split(sep).join('/'))

/** Imports de ejecución (no `import type`) hacia otros archivos de src/. */
function importsInternos(archivo: string): string[] {
  const codigo = readFileSync(archivo, 'utf8')
  const destinos: string[] = []
  for (const m of codigo.matchAll(/^import\s+(type\s+)?(?:[^'"]*?\s+from\s+)?'(\.[^']+)'/gm)) {
    if (m[1]) continue
    const destino = resolve(dirname(archivo), m[2]!)
    if (destino.startsWith(SRC + sep)) destinos.push(aSrc(destino))
  }
  return destinos
}

const capa = (rutaSrc: string) => rutaSrc.split('/')[0]!

function permitido(origen: string, destino: string): boolean {
  const [co, cd] = [capa(origen), capa(destino)]
  if (!(co in NIVEL) || !(cd in NIVEL)) return true // raíz (main.tsx) y pruebas/ no son capas
  if (NIVEL[cd]! <= NIVEL[co]!) return true
  return `${origen} -> ${destino}` in EXCEPCIONES || `${co}/* -> ${destino}` in EXCEPCIONES
}

const ARCHIVOS = archivos(SRC).filter((a) => !aSrc(a).startsWith('pruebas/'))

describe('arquitectura en capas del frontend', () => {
  it('ninguna capa depende de una capa superior', () => {
    const violaciones = ARCHIVOS.flatMap((archivo) =>
      importsInternos(archivo)
        .filter((destino) => !permitido(aSrc(archivo), destino))
        .map((destino) => `${aSrc(archivo)} -> ${destino}`),
    )
    expect(violaciones).toEqual([])
  })

  it('los componentes genéricos (ui/) no conocen el dominio del juego', () => {
    const violaciones = ARCHIVOS.filter((a) => aSrc(a).startsWith('componentes/ui/')).flatMap((archivo) =>
      importsInternos(archivo)
        .filter((destino) => !destino.startsWith('componentes/ui/') && NIVEL[capa(destino)] !== 1)
        .map((destino) => `${aSrc(archivo)} -> ${destino}`),
    )
    expect(violaciones).toEqual([])
  })

  it('el motor de Python no depende de React ni de la interfaz', () => {
    const conReact = ARCHIVOS.filter((a) => aSrc(a).startsWith('motor/')).filter((a) =>
      /from 'react(-dom)?'/.test(readFileSync(a, 'utf8')),
    )
    expect(conReact.map(aSrc)).toEqual([])
  })

  it('cada excepción documentada se sigue usando (si no, hay que borrarla)', () => {
    const usadas = new Set(
      ARCHIVOS.flatMap((archivo) =>
        importsInternos(archivo).flatMap((destino) => {
          const origen = aSrc(archivo)
          return [`${origen} -> ${destino}`, `${capa(origen)}/* -> ${destino}`]
        }),
      ),
    )
    expect(Object.keys(EXCEPCIONES).filter((e) => !usadas.has(e))).toEqual([])
  })
})
