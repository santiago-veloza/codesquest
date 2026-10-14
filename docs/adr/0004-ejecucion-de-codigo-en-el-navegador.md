# ADR-0004: El código del estudiante se ejecuta en el navegador (Pyodide en un Web Worker)

- **Estado:** aceptado
- **Fecha:** 2026-10-05

## Contexto
El juego necesita ejecutar el Python que escriben los estudiantes. Ejecutar código arbitrario en el
servidor es uno de los riesgos más graves de una aplicación web (ejecución remota de código).

## Decisión
- **Pyodide 314.0.7 (CPython 3.14.2 compilado a WebAssembly)** dentro de un **Web Worker**.
  Se sirve desde nuestro propio servidor (`public/pyodide`, copiado de `node_modules` con la versión
  fijada), sin CDN: no hay dependencia externa ni fuga de la IP del estudiante.
- **Arnés en Python** (`frontend/src/motor/python/arnes.py`): ejecuta en un espacio aislado por
  ejecución, captura la salida (con tope), simula `input()`, toma la foto de variables, encola las
  acciones de juego, evalúa reglas de estructura con `ast` y bloquea `import js`/`pyodide`.
- **Límite de tiempo de 3 s**: si el código no termina, el hilo principal **termina el Worker a la
  fuerza** y crea uno nuevo. La página nunca se congela (verificado en Edge: 60 fps durante un bucle
  infinito).
- **Variantes con preparación en Python** (`"precio = 3.0"`), no en JSON: JSON no distingue `3.0`
  (float) de `3` (int), y el juego enseña tipos de datos.
- **Golden tests** en Node con el mismo Pyodide y el mismo evaluador: la solución de referencia de
  cada desafío pasa y cada error típico falla.
- **El servidor nunca ejecuta código**: guarda cada intento, revalida la estructura con `ast`
  (sin ejecutar) y es la única fuente de verdad de XP, nivel y logros.

## Alternativas consideradas
- **Ejecutar en el servidor** (subprocess/contenedor): máximo control, pero exige aislamiento serio
  (contenedor sin red, límites de CPU/memoria/tiempo) y más infraestructura; fuera del alcance.
- **Interrumpir con `SharedArrayBuffer`** (`pyodide.setInterruptBuffer`): conserva Python cargado
  tras un bucle infinito, pero exige cabeceras COOP/COEP en todo el sitio, que evitamos con Godot
  (exportación de un solo hilo, ADR-0002).
- **Pyodide desde CDN (jsDelivr)**: más simple, pero dependencia externa y envío de datos a terceros.

## Consecuencias y limitaciones conocidas
- **Un cliente manipulado puede reportar un resultado falso.** Es aceptable en un proyecto educativo:
  el estudiante solo se engañaría a sí mismo, y el servidor revalida la estructura del código.
  Si se requiriera rigor, la evolución es un servicio de ejecución aislado en el servidor.
- **Primera carga pesada**: ~12 MB (wasm + biblioteca estándar) la primera vez; luego queda en caché.
  En producción Nginx los servirá comprimidos (Sprint 5) y conviene precargar Python al entrar al mapa.
- **Tras un tiempo agotado** el Worker nuevo vuelve a preparar Python (~3–4 s desde la caché).
- Los golden tests en Node no tienen límite de tiempo: un error típico con bucle infinito (Mundo 3)
  necesitará ejecutarse en un `worker_thread` con límite. Pendiente para ese mundo.
