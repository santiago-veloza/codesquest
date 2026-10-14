// Copia el núcleo de Pyodide (versión fijada en package.json) a public/pyodide para servirlo desde
// nuestro propio servidor: sin CDN externo (privacidad) y con la misma versión que usan las pruebas.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ARCHIVOS = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']

const require = createRequire(import.meta.url)
const origen = dirname(require.resolve('pyodide/package.json'))
const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pyodide')

mkdirSync(destino, { recursive: true })
for (const archivo of ARCHIVOS) copyFileSync(join(origen, archivo), join(destino, archivo))
console.log(`Pyodide copiado a ${destino}`)
