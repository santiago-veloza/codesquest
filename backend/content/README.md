# Contenido del juego (datos versionados)

Todo el contenido vive aquí, no dentro del código. Se valida y se carga con:

```bash
cd backend
python manage.py cargar_contenido --solo-validar   # solo revisa, no escribe
python manage.py cargar_contenido                  # valida y carga (idempotente)
```

| Archivo | Contenido | Esquema |
|---------|-----------|---------|
| `mundos/mundo_N.json` | Un mundo con sus desafíos | `esquemas/mundo.schema.json` |
| `logros.json` | Catálogo de logros | `esquemas/logros.schema.json` |

## Laberinto de cada mundo (`mapa`)

Una fila de texto por línea del laberinto. `w` pared · `c` camino · `a` inicio del jugador ·
`s` salida · `e` enemigo (patrulla; se derrota disparando con Espacio) · `1`-`9` obstáculo (se
resuelve con el desafío de ese **orden**). Los laberintos tienen **rutas alternativas**.
`cargar_contenido` verifica que **cada obstáculo sea alcanzable** y que, con todos resueltos, se
llegue a la salida. La salida solo se abre cuando los 3 desafíos están resueltos.

Los mapas de los mundos 1-4 se generan con `python herramientas/generar_laberintos.py` (semilla
fija); se pueden editar a mano después.

## Reglas

- `codigo` es la clave estable: cambiar un título actualiza el registro; cambiar el `codigo` crea otro.
- Cada desafío lleva exactamente las pistas que fija `backend/config/juego.py` (`PISTAS_POR_DESAFIO`).
- `______` marca el hueco del código base.
- `variantes`: cada una ejecuta el código del estudiante con otras condiciones y **debe pasar con todas**
  (evita respuestas escritas a mano):
  - `preparacion`: código Python que se ejecuta antes del del estudiante, **solo asignaciones de
    valores literales** (p. ej. `"precio = 3.0
cantidad = 2"`). Es Python y no JSON porque JSON no
    distingue `3.0` (float) de `3` (int), y ese tipo importa en un juego que enseña tipos de datos.
  - `entradas`: respuestas simuladas para `input()`, en orden.
  - `esperado`: valores para los `{{marcadores}}` de las pruebas. En salidas de texto escríbelos como
    Python los imprime (`"34.0"`, no `34`).
- `funciones_juego` (en el mundo): funciones de la API de juego que se desbloquean en ese mundo
  (`avanzar`, `saltar`...). Cada llamada encola una acción para la escena de Godot.
- `solucion_referencia` y `errores_tipicos` alimentan los golden tests y **nunca** se envían al cliente.
- Tipos de prueba: `salida`, `variables`, `estado_escena`, `estructura` (reglas AST:
  `usa_nodo`, `min_funciones`, `prohibe_literal`, `usa_funcion`).
- Si un archivo es inválido no se carga nada (todo ocurre en una transacción).
