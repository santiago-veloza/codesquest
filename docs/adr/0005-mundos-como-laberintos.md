# ADR-0005: Cada mundo es un laberinto que se recorre con el teclado; los obstáculos son desafíos

- **Estado:** aceptado
- **Fecha:** 2026-10-13
- **Reemplaza en parte:** la sección 6 de la especificación (el código del estudiante movía al personaje)

## Contexto
El equipo quiere una experiencia de juego más clara para el docente y los estudiantes: recorrer un
laberinto y encontrar obstáculos que solo se superan programando. Antes, entrar a un mundo mostraba
solo una lista de desafíos.

## Decisión
- **Cada mundo (1 a 4) tiene un laberinto** definido como datos en `content/mundos/mundo_N.json`
  (campo `mapa`; leyenda `w` pared, `c` camino, `a` inicio, `s` salida, `1-9` obstáculo = desafío con
  ese orden). Dificultad creciente: 15×11, 21×13, 27×15 y 33×17 casillas; 3 desafíos por mundo.
- **El jugador se mueve con flechas o WASD** en la escena de Godot (vista desde arriba, cámara que lo
  sigue y minimapa en la esquina superior derecha). Sin límite de tiempo.
- **Al chocar con un obstáculo** Godot avisa a React, que abre el desafío en un modal. **Hasta que el
  servidor confirma** el intento correcto, el obstáculo no desaparece.
- **La salida se abre** con todos los obstáculos resueltos; al pisarla, `POST /mundos/{id}/completar/`
  marca el mundo como completado y desbloquea el siguiente. El servidor lo comprueba con sus propios
  datos (intentos correctos), no con lo que diga el navegador.
- **Validación de los mapas al cargar contenido** (BFS): la salida debe ser alcanzable y **cada
  obstáculo debe ser obligatorio** (si se lo trata como pared, la salida queda inalcanzable).
- **El movimiento ocurre en el navegador**, no en el servidor: el juego es de un jugador y los
  navegadores no abren sockets TCP. El servidor guarda lo que importa: intentos y progreso.

### Actualización 2026-10-14: enemigos y rutas alternativas
- **Enemigos (`e` en el mapa)** que patrullan (2, 3, 4 y 5 según el mundo, más rápidos en los
  difíciles). **Espacio dispara** hacia donde mira el jugador; el enemigo derrotado reaparece a los
  12 s. Si un enemigo alcanza al jugador **lo empuja una casilla** (sin "game over", sección 5.1).
- **Laberintos con rutas alternativas** (se abren muros al generar): un enemigo nunca deja encerrado
  al jugador. Los obstáculos ya no tienen que ser obligatorios en el camino: la regla cambia de
  "cada obstáculo es obligatorio" a **"el laberinto se puede terminar"** (cada obstáculo es
  alcanzable y, con los 3 resueltos, se llega a la salida). La salida sigue cerrada hasta resolver
  los 3 desafíos, y el servidor solo completa el mundo con los 3 intentos correctos guardados.
- Generador reproducible en `herramientas/generar_laberintos.py`; usa la MISMA función de validación
  del servidor (`apps/contenido/laberinto.se_puede_terminar`). Detectó y evitó un mapa imposible
  (obstáculo detrás de la salida cerrada).

## Alternativas consideradas
- **El código del estudiante mueve al personaje por el laberinto** (`avanzar()`, `girar()`): muy
  didáctico, pero exige simular el laberinto dentro del motor de Python y reescribe todos los
  desafíos. Se conserva como evolución posible; las funciones de juego (`avanzar()`, `picar()`…)
  siguen existiendo dentro de los desafíos de los Mundos 2 a 4.
- **Servidor de sockets con el estado del jugador** (código previo del equipo): adecuado para
  multijugador local, pero no funciona en el navegador y agrega latencia sin beneficio.

## Consecuencias
- Nuevos endpoints: `GET /mundos/{id}/` (mapa + obstáculos resueltos), `POST /desafios/{id}/intentos/`
  y `POST /mundos/{id}/completar/`.
- Las reglas de estructura (AST) se movieron a `compartido/python/reglas_estructura.py`: la usan el
  navegador y el servidor (que revalida los intentos correctos sin ejecutar código).
- El Mundo 5 (Bug Master) queda sin laberinto hasta el Sprint 4: se muestra la lista de desafíos.
- Accesibilidad: el canvas de Godot no es accesible para lectores de pantalla; la página ofrece la
  lista de obstáculos con su estado y un botón para abrir cada desafío sin recorrer el laberinto.
- XP, nivel y logros siguen pendientes (paso de gamificación): por ahora `xp_otorgada = 0`.
