# ADR-0002: Godot para las escenas del juego, React para la plataforma (arquitectura híbrida)

- **Estado:** aceptado
- **Fecha:** 2026-10-04

## Contexto
El equipo quiere que CODEQUEST se sienta como un videojuego real; el docente evalúa
principalmente la experiencia de juego. El equipo ya conoce React.
Restricciones verificadas (2026-10-04):
- Godot 4.7.2 es la versión estable.
- `godot-python` no es usable en Godot 4 ("Heavy refactoring in progress"): no hay forma
  confiable de ejecutar Python del estudiante dentro de Godot.
- Godot 4 no exporta proyectos C# a web: en web solo GDScript.
- Godot permite exportación web de un solo hilo (desde 4.3), sin cabeceras COOP/COEP.
- `JavaScriptBridge` (create_callback, get_interface) permite comunicar Godot con la página.

## Decisión
- **React + Vite + TypeScript**: autenticación, editor (CodeMirror), ejecución de Python con
  Pyodide en Web Worker, evaluador, perfil, mapa de progreso y logros.
- **Godot 4.7 (GDScript, exportación web de un hilo)**: `EscenaMundo` — capas con parallax,
  personajes animados, efectos, audio de escena, jefe final y cinemáticas.
- **Contrato**: React ejecuta el código y produce la `ColaDeAcciones` (JSON versionado);
  Godot solo la reproduce y responde con eventos (`acciones_terminadas`, `estado_escena`).
  Comunicación vía `JavaScriptBridge` con callbacks; **prohibido usar `eval`**.
- **Django + DRF** sin cambios. Godot no habla con la API: todo pasa por React.

## Alternativas consideradas
- **Solo React**: más simple, pero menor calidad de juego, que es lo que más se evalúa.
- **Todo en Godot web**: editor, formularios y auth dentro del canvas; Pyodide igual requiere
  JavaScript; accesibilidad incierta.
- **Godot de escritorio**: sin ejecución de Python estable, sin acceso web.

## Consecuencias
- Dos tecnologías de frontend; se mitiga con un contrato JSON pequeño y documentado.
- Framer Motion/Howler dejan de usarse en las escenas (React puede usar CSS para la UI).
- Pruebas de escena con GUT 9.7.1 (la versión que corresponde a Godot 4.7.x) además de Vitest.
- Riesgos a medir en el prototipo: peso de la exportación web, tiempo de carga,
  accesibilidad del canvas y navegación por teclado.
- El documento académico debe actualizar los diagramas de arquitectura, componentes y despliegue.
