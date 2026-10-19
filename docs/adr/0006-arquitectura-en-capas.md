# ADR-0006: Arquitectura en capas (monolito modular) con reglas verificadas por pruebas

- **Estado:** aceptado
- **Fecha:** 2026-10-18

## Contexto

El proyecto ya seguía una arquitectura desde el inicio (ADR-0002: React + Godot + Django REST), pero
solo estaba descrita a grandes rasgos en el README. Con 5 mundos, gamificación, vida y audio, el
código creció y aparecieron dos dependencias "hacia arriba" (una vista que importaba la vista de otra
app y el estado del frontend que importaba la capa de la aplicación). Sin reglas escritas y
verificadas, esas desviaciones se acumulan y el sistema se vuelve difícil de mantener entre dos
desarrolladores.

## Decisión

Se formaliza la arquitectura existente —**cliente-servidor híbrido** con un **backend monolito
modular en capas**— y sus reglas se verifican con pruebas automáticas que fallan indicando el archivo
y la línea que las rompen.

### Vista general

```
Navegador ─────────────────────────────────────────────┐      Servidor (Django REST)
 React (plataforma)  ←─ puente JSON ─→  Godot (escena)  │ HTTP  apps/: usuarios · contenido ·
 Pyodide en Web Worker (ejecuta el código del alumno)   │ ───→  progreso · gamificacion · nucleo
└───────────────────────────────────────────────────────┘      PostgreSQL · backend/content/ (JSON)
```

### Backend: cada app de `backend/apps/` en tres capas

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Presentación | `views.py`, `serializers.py`, `urls.py`, `admin.py`, `acceso.py`, `seguridad.py` | HTTP: permisos, límites, códigos de estado y formato de entrada/salida |
| Lógica | `servicios.py` y módulos de dominio (`laberinto.py`, `estructura.py`, `carga.py`) | Reglas del juego y transacciones |
| Datos | `models.py` | Esquema y restricciones de integridad |

Reglas (`backend/apps/nucleo/tests/test_arquitectura.py`):

1. Las vistas **no escriben** en la base de datos: toda escritura pasa por `servicios.py`. Las lecturas
   simples con los querysets de DRF sí están permitidas.
2. Los modelos no dependen de capas superiores ni de HTTP.
3. La lógica no depende de la presentación (no importa vistas, serializers ni respuestas HTTP).
4. Ninguna vista importa la vista de otra app; lo compartido va en un módulo propio
   (ej.: `progreso/acceso.py` con `exigir_mundo_accesible`).
5. Los servicios de distintas apps no forman ciclos (`progreso` → `gamificacion`, nunca al revés).
6. El servidor **nunca ejecuta** código de estudiantes: sin `exec`, `eval`, `compile`, `subprocess`
   ni `os.system` (ADR-0004); el código solo se analiza con `ast`.

### Frontend: capas por carpeta de `frontend/src/`

| Nivel | Carpetas | Responsabilidad |
|---|---|---|
| 6 | `app/` | Enrutador, Layout y guardias (raíz de composición) |
| 5 | `paginas/` | Pantallas: componen componentes, estado y datos |
| 4 | `componentes/` (`ui/` genéricos; `juego/`, `editor/`, `escena/` de dominio) | Piezas de interfaz |
| 3 | `estado/`, `audio/` | Estado de sesión y de juego (Zustand), efectos de sonido |
| 2 | `api/`, `motor/` | Datos del servidor y claves de caché · ejecución de Python |
| 1 | `config/`, `textos/`, `utilidades/`, `estilos/` | Base sin dependencias internas |

Reglas (`frontend/src/arquitectura.test.ts`): un archivo solo importa de su nivel o de niveles
inferiores (los `import type` no cuentan); `componentes/ui/` no conoce el dominio; `motor/` no usa
React. Excepciones documentadas en la propia prueba, cada una con su motivo: las páginas usan la tabla
de rutas `app/rutas.ts` (no importa nada) y `api/cliente.ts` lee el token de `estado/sesion`
(ADR-0003). Una excepción que deja de usarse hace fallar la prueba para que se borre.

### Juego (Godot): `frontend/godot/scripts/`

| Parte | Archivos | Regla |
|---|---|---|
| Puente | `web/puente_web.gd`, `web/json_seguro.gd` | Lo **único** que habla con la página (`JavaScriptBridge`); todo lo que llega se valida |
| Escena | `escena_laberinto.gd` + tablero, jugador, enemigo, obstáculo, minimapa, barra de vida, sonidos | Orquesta y dibuja |
| Lógica pura | `laberinto.gd`, `patrulla.gd`, `vida.gd`, `contrato_laberinto.gd` | `RefCounted`, sin nodos: se prueba sola |
| Configuración | `config_laberinto.gd` | Única fuente de constantes |

Reglas: `frontend/godot/tests/unit/test_arquitectura.gd`.

### Transversales

- Constantes de juego solo en `backend/config/juego.py`, `frontend/src/config/juego.ts` y
  `frontend/godot/scripts/laberinto/config_laberinto.gd`; el contenido (mundos, desafíos, logros) solo en
  `backend/content/` como JSON validado por esquema.
- El servidor es la única fuente de verdad de progreso, XP, nivel y logros; el navegador solo muestra.

## Alternativas consideradas

- **Rehacer el backend con arquitectura hexagonal / limpia** (puertos y adaptadores, entidades
  separadas del ORM): descartada. Duplicaría cada modelo en entidad + repositorio sin beneficio real en
  un proyecto de dos personas y 16 semanas, y obligaría a reescribir código que ya funciona y está
  probado (sobreingeniería).
- **Microservicios**: descartada; un solo despliegue es suficiente y más simple de operar.
- **Documentar sin pruebas**: descartada; las reglas escritas sin verificación se dejan de cumplir.

## Consecuencias

- Ventajas: la arquitectura deja de depender de la memoria del equipo; romper una capa se detecta en
  las pruebas con el archivo y la línea; facilita explicar el sistema en el documento académico
  (diagramas de componentes y de despliegue).
- Desventajas: algunas excepciones pragmáticas quedan explícitas (por ejemplo, los servicios de
  `usuarios` lanzan excepciones de DRF y las vistas de solo lectura usan querysets directamente).
- Al agregar una carpeta nueva al frontend hay que asignarle un nivel en `arquitectura.test.ts`.
