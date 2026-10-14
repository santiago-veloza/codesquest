import react from '@vitejs/plugin-react'
import { searchForWorkspaceRoot } from 'vite'
import { defineConfig } from 'vitest/config'

// Backend de Django en desarrollo.
const BACKEND_DESARROLLO = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Proxy de /api: el navegador ve un solo origen, así la cookie SameSite=Strict del refresh
    // funciona y no hace falta CORS (en producción Nginx cumple el mismo papel).
    proxy: { '/api': { target: BACKEND_DESARROLLO } },
    fs: {
      // Fuentes únicas fuera de frontend/: el aviso de privacidad y las reglas AST compartidas.
      allow: [searchForWorkspaceRoot(process.cwd()), '../docs/legal', '../compartido/python'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/configuracion.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    restoreMocks: true,
    unstubGlobals: true,
    // Las pruebas del motor cargan Pyodide (CPython en WebAssembly) en paralelo con las de interfaz;
    // en equipos modestos eso alarga los tiempos. El margen evita fallos falsos, no oculta lentitud real.
    testTimeout: 20_000,
  },
})
