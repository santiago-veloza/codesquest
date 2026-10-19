import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const godot = process.env.GODOT_BIN ?? join(raiz, 'Godot_v4.7.2-stable_win64_console.exe')
const proyectoGodot = join(raiz, 'frontend', 'godot')
const destino = join(raiz, 'frontend', 'public', 'juego')

if (!existsSync(godot)) {
  console.error(`No se encontró Godot en ${godot}. Define GODOT_BIN con la ruta del ejecutable.`)
  process.exit(1)
}
mkdirSync(destino, { recursive: true })
const resultado = spawnSync(
  godot,
  ['--headless', '--path', proyectoGodot, '--export-release', 'Web', join(destino, 'index.html')],
  { stdio: 'inherit' },
)
process.exit(resultado.status ?? 1)
