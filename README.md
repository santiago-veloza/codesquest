# CODEQUEST — La aventura del programador

Plataforma multimedia educativa con mecánicas de videojuego para aprender fundamentos de
programación en Python (variables, condicionales, ciclos y funciones).

Proyecto de la asignatura **Desarrollo de Sistemas Multimedia** — Ingeniería de Sistemas,
Universidad Cooperativa de Colombia (Villavicencio).

## Arquitectura (resumen)

Cliente-servidor híbrido con backend **monolito modular en capas** (presentación → lógica → datos);
las capas y sus reglas, verificadas por pruebas, están en [ADR-0006](docs/adr/0006-arquitectura-en-capas.md).

```
codesquest/
├── backend/                Servidor: API REST con Django 5.2 LTS + DRF (Python 3.13)
│   ├── apps/               usuarios · contenido · progreso · gamificacion · nucleo
│   ├── config/             settings y constantes de juego (juego.py)
│   ├── content/            mundos, desafíos y logros como datos (JSON validado por esquema)
│   ├── compartido/python/  reglas de estructura (AST): las usa Django y también el navegador
│   └── herramientas/       generar_laberintos.py
├── frontend/               Navegador: React + Vite + TypeScript
│   ├── src/                plataforma, editor y motor de Python (Pyodide en un Web Worker)
│   ├── public/             estáticos; juego/ = exportación web de Godot (generada)
│   └── godot/              proyecto Godot 4.7 (GDScript): laberintos, personajes, efectos y audio
├── docs/                   convenciones, ADR, aviso de privacidad y OpenAPI
├── assets/                 recursos originales (Kenney, CC0) de donde se copian sprites y sonidos
└── docker-compose.yml      PostgreSQL 18
```

`frontend/` lee de `backend/` solo dos cosas: las reglas de `backend/compartido/` (el navegador
evalúa con las mismas reglas que revalida el servidor) y `backend/content/` en las pruebas golden.

El código de los estudiantes **nunca** se ejecuta en el servidor (ver `docs/adr/`).

## Requisitos previos

| Herramienta | Versión | Para qué |
|-------------|---------|----------|
| Python | 3.13 | Backend (entorno virtual `venv`) |
| Node.js | **24 LTS** (24.11 o superior; ver `.nvmrc`). React Router 8 y jsdom exigen ≥ 22.22 | Frontend |
| Godot Engine | 4.7.x estándar (no la versión .NET) | Escenas del juego |
| Docker Desktop | con Docker Compose v2 | Base de datos PostgreSQL 18 |
| Git | reciente | Control de versiones |

## Instalación (desarrollo)

```bash
# 1. Variables de entorno
cp .env.example .env          # luego edita .env y cambia las contraseñas/clave

# 2. Base de datos (Docker Desktop debe estar abierto)
docker compose up -d db
docker compose ps             # el servicio "db" debe aparecer como healthy

# 3. Entorno de Python (desde la raíz del proyecto)
python -m venv venv
venv\Scripts\activate         # Windows (en Linux/macOS: source venv/bin/activate)
pip install -r backend/requirements/dev.txt
```

### Backend (Django)

Con el `venv` activado y la base de datos arriba (`docker compose up -d db`):

```bash
cd backend
python manage.py migrate
python manage.py cargar_contenido          # mundos, desafíos y logros desde backend/content/ (idempotente)
python manage.py createsuperuser        # cuenta de docente_admin para /admin/
python manage.py runserver 127.0.0.1:8000
```

| URL | Para qué |
|-----|----------|
| http://127.0.0.1:8000/api/v1/salud/ | Estado de la API y de la base de datos |
| http://127.0.0.1:8000/api/v1/docs/ | Documentación interactiva (Swagger / OpenAPI) |
| http://127.0.0.1:8000/admin/ | Administración de Django |
| http://127.0.0.1:8000/admin/estadisticas/ | **Estadísticas del curso** para el docente (avance por mundo, dificultad de cada desafío, estudiantes y exportación CSV) |

Endpoints de autenticación (detalle en `/api/v1/docs/` y `docs/openapi.yaml`):

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/registro/` | Crea la cuenta (exige `acepta_privacidad: true`) e inicia sesión |
| POST | `/api/v1/auth/login/` | Devuelve `access`; el refresh queda en cookie HttpOnly |
| POST | `/api/v1/auth/refresh/` | Nuevo `access` (requiere cabecera `X-CodeQuest-Cliente: web`) |
| POST | `/api/v1/auth/logout/` | Invalida el refresh (misma cabecera) |
| GET/PATCH | `/api/v1/perfil/` | Perfil propio; solo `apodo` y `avatar` son editables |
| GET | `/api/v1/mundos/` | Mundos con su estado para el usuario (bloqueado / desbloqueado / completado) |
| GET | `/api/v1/mundos/{id}/desafios/` | Desafíos de un mundo (403 si está bloqueado) |
| GET | `/api/v1/desafios/{id}/` | Enunciado, código base, pistas, pruebas y variantes. **Nunca** la solución de referencia |
| GET | `/api/v1/mundos/{id}/` | Laberinto del mundo: mapa y obstáculos (resueltos o pendientes) |
| POST | `/api/v1/desafios/{id}/intentos/` | Registra un intento; el servidor revalida la estructura y decide si el obstáculo queda resuelto |
| POST | `/api/v1/mundos/{id}/completar/` | Completa el laberinto (409 si faltan obstáculos) y desbloquea el siguiente mundo |
| POST | `/api/v1/mundos/{id}/reiniciar/` | Game over: los obstáculos del laberinto vuelven a cerrarse (el historial de intentos se conserva) |
| GET | `/api/v1/logros/` | Catálogo de logros con `obtenido` y `fecha_obtencion` del usuario |

Intentos y completar mundo devuelven `recompensa` (XP, puntos, nivel, `subio_de_nivel`, `logros_nuevos`).
Las fórmulas están en `backend/config/juego.py`; el navegador nunca calcula XP.

Calidad y pruebas (desde `backend/`):

```bash
python -m pytest                                    # pruebas (usa PostgreSQL)
ruff format .                                       # formato automático
ruff check .                                        # estilo, bugs comunes y seguridad
python manage.py spectacular --validate --fail-on-warn --file NUL   # valida el esquema OpenAPI
pip-audit -r requirements/base.txt                  # dependencias con vulnerabilidades conocidas
```

> Solo se aceptan cuentas con correo **@campusucc.edu.co** (variable `DOMINIOS_CORREO_PERMITIDOS`
> en `.env`; las cuentas de docente/administrador están exentas).

> La base de datos del contenedor usa el puerto **5434** y el host `127.0.0.1` (no `localhost`:
> en Windows, `localhost` intenta primero IPv6 y cada conexión tarda ~5 s).

### Frontend (React)

Con el backend corriendo en `127.0.0.1:8000`:

```bash
cd frontend
npm install
npm run dev            # http://127.0.0.1:5173  (proxy de /api hacia Django)
```

> Abre siempre la app por **http://127.0.0.1:5173**: el proxy hace que el navegador vea un solo
> origen y así funciona la cookie HttpOnly del refresh (ADR-0003).

| Comando | Para qué |
|---------|----------|
| `npm test` | Pruebas (Vitest + Testing Library): contraste WCAG AA, motor de Python y **golden tests** de todos los desafíos de `backend/content/` |
| `npm run lint` | oxlint |
| `npm run build` | Verificación de tipos (TypeScript estricto) y build de producción |
| `npm run exportar:juego` | Exporta la escena de Godot (`frontend/godot/`) a `public/juego/`. Ejecútalo tras cambiar algo en Godot (usa `GODOT_BIN` o el ejecutable de la raíz) |
| `npm run generar:tipos` | Regenera `src/api/esquema.d.ts` desde `docs/openapi.yaml` (tras cambiar la API) |

`npm run dev` y `npm run build` copian primero Pyodide a `public/pyodide/` (servido localmente, sin CDN).
En desarrollo, **http://127.0.0.1:5173/laboratorio** permite probar el motor de Python a mano.

Para actualizar los tipos tras un cambio del backend:
`python manage.py spectacular --file ../docs/openapi.yaml` (en `backend/`) y luego `npm run generar:tipos`.

### Juego (Godot)

1. Abre Godot 4.7.2 → **Importar** → selecciona `frontend/godot/project.godot`.
2. Abre `escenas/escena_laberinto.tscn`, elige en el Inspector **Mundo En Editor** (0-5) y **Avatar En
   Editor**: el laberinto se ve en la vista 2D (nodo `VistaPrevia`). Pulsa **F6** para jugarlo.
   Flechas/WASD para moverte, **Espacio** para disparar; frente a un candado, **Enter** lo
   "resuelve" y tras un game over reinicia (solo en el editor, para probar sin la página).
   Los mapas se regeneran con `python backend/herramientas/generar_laberintos.py`.
3. Para verlo dentro de la app: `npm run exportar:juego` (en `frontend/`). Es la única exportación:
   la web la sirve desde `frontend/public/juego/` y se comunica con ella por el puente (`PuenteWeb`).
4. Pruebas (GUT 9.7.1), desde la raíz del proyecto:

```bash
<ruta>/Godot_v4.7.2-stable_win64_console.exe --headless --path frontend/godot -s addons/gut/gut_cmdln.gd -gdir=res://tests -ginclude_subdirs -gexit
```

## Documentación

- [Convenciones del equipo](docs/CONVENCIONES.md)
- [Decisiones de arquitectura (ADR)](docs/adr/)
- [Aviso de privacidad (Ley 1581)](docs/legal/aviso_privacidad.md). Si cambia su texto, sube
  `VERSION_AVISO_PRIVACIDAD` en `backend/config/settings/base.py` para pedir de nuevo el consentimiento.
- [Contenido del juego (formato de mundos y desafíos)](backend/content/README.md)
- [Cambios para el documento académico](docs/CAMBIOS_DOCUMENTO_ACADEMICO.md)
- [Créditos y licencias de recursos](CREDITS.md) · [Recursos pendientes](ASSETS_TODO.md)
