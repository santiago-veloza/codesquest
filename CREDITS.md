# Créditos y licencias

Todo recurso de terceros (fuentes, audio, imágenes, librerías incluidas en el proyecto) se registra
aquí con su licencia verificada en la fuente original. Solo se aceptan recursos propios, CC0, CC-BY
(con atribución) o licencias de software permisivas (MIT, BSD, Apache 2.0) y OFL para fuentes.

## Recursos incluidos o distribuidos con el juego

| Recurso | Autor | Licencia | Fuente (URL) | Uso en el proyecto |
|---------|-------|----------|--------------|--------------------|
| Press Start 2P (fuente) | The Press Start 2P Project Authors (CodeMan38) | SIL OFL 1.1 | https://fontsource.org/fonts/press-start-2p | Títulos (estilo pixel) |
| Inter (fuente variable) | The Inter Project Authors (Rasmus Andersson) | SIL OFL 1.1 | https://fontsource.org/fonts/inter | Texto de la interfaz |
| JetBrains Mono (fuente variable) | The JetBrains Mono Project Authors | SIL OFL 1.1 | https://fontsource.org/fonts/jetbrains-mono | Editor de código |
| GUT 9.7.1 (Godot Unit Test) | Butch Wesley (bitwes) | MIT | https://github.com/bitwes/Gut | Pruebas de las escenas (`game/addons/gut`) |
| Godot Engine 4.7.2 | Godot Engine contributors | MIT | https://godotengine.org | Motor de las escenas del juego |
| Pyodide 314.0.7 (CPython 3.14.2 en WebAssembly) | Pyodide contributors / Python Software Foundation | MPL-2.0 (Pyodide), PSF License (CPython) | https://pyodide.org | Ejecutar el Python del estudiante en el navegador (`public/pyodide`, sin modificar) |
| New Platformer Pack 1.1 (tiles, personajes, sonidos) | Kenney (www.kenney.nl) | CC0 1.0 (dominio público) | https://kenney.nl/assets/new-platformer-pack | Paredes, candados (obstáculos), puertas de salida, estrella (disparo), enemigos (ratón, mariquita, slimes) y personajes de los avatares Byte, Pixel y Chispa. Originales en `assets/`; copias usadas en `game/assets/sprites/` `frontend/public/img/avatares/` y `frontend/public/img/logros/` (moneda, gemas, bomba y estrella como iconos de logros). Sonidos: `sfx_throw`, `sfx_disappear`, `sfx_hurt`, `sfx_select`, `sfx_magic`, `sfx_bump` y `sfx_jump-high` en `game/assets/sonidos/`; `sfx_coin`, `sfx_gem` y `sfx_jump-high` en `frontend/public/sonidos/` |
| Favicon `</>` | Equipo CODEQUEST | Propio | — | Icono del sitio |

Las fuentes se sirven desde el propio servidor (paquetes `@fontsource`), no desde Google Fonts, para
no enviar la IP de los estudiantes a terceros. Las licencias están en `frontend/node_modules/@fontsource*/LICENSE`.

## Librerías de software (dependencias)

Backend (PyPI): Django, Django REST Framework, djangorestframework-simplejwt, drf-spectacular,
django-cors-headers, django-environ, psycopg, jsonschema — todas BSD/MIT/LGPL compatibles.
Frontend (npm): React, React Router, TanStack Query, Zustand, Vite, Vitest, Testing Library — MIT.
Las versiones exactas están en `backend/requirements/*.txt` y `frontend/package-lock.json`.
