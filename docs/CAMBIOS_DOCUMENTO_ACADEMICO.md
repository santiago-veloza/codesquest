# Cambios que afectan al documento académico

Lista acumulada durante el Sprint 1. Al cerrar el sprint se entrega completa y depurada.

## Diagrama entidad-relación

| Entidad | Cambio respecto al diagrama original | Motivo |
|---------|--------------------------------------|--------|
| usuario | Sin `username`, `nombre` ni `apellido`; se identifica por `email` (único sin distinguir mayúsculas). Agrega `rol` (estudiante / docente_admin), `fecha_registro`, `is_active`, `is_staff`, `fecha_aceptacion_privacidad`, `version_aviso_privacidad` | Inicio de sesión por correo; minimización de datos y evidencia del consentimiento (Ley 1581) |
| perfil | Agrega `energia` (0–100) además de apodo, avatar, experiencia, puntos y nivel | Mecánica narrativa de energía |
| mundo | Agrega `codigo` (clave estable), `conceptos`, `activo`, `funciones_juego` (JSON) | Carga idempotente del contenido; API de juego que se desbloquea por mundo |
| desafio | Agrega `codigo` (ej. "1.1"), `variantes` (JSON: `preparacion` en Python, `entradas`, `esperado`) | Carga idempotente; pruebas con varios valores sin respuestas "quemadas" |
| intento_desafio | Agrega `tipo_error`, `pistas_usadas`, `tiempo_ms`, `xp_otorgada` | Estadísticas y cálculo de XP auditable |
| progreso_mundo | Agrega `estado` (bloqueado / desbloqueado / completado) y `actualizado` | Mapa de progreso |
| logro | Agrega `codigo`, `criterio`, `mundo` (FK opcional), `icono`, `orden` | Otorgamiento automático en el servidor |
| usuario_logro | Sin cambios de atributos (`fecha_obtencion`) | — |

Reglas de integridad nuevas (dibujarlas como restricciones o notas):

- UNIQUE: (usuario, mundo) en progreso_mundo; (usuario, logro) en usuario_logro; (mundo, orden) en desafio.
- CHECK: porcentaje ≤ 100; energía ≤ 100; nivel ≥ 1; pistas_usadas ≤ 3; xp_otorgada = 0 si el intento no es correcto;
  logro con criterio "completar_mundo" ⇔ tiene mundo.
- ON DELETE: borrar un usuario borra en cascada su perfil, intentos, progreso y logros (derecho de supresión);
  mundos y desafíos con historial no se pueden borrar (PROTECT).

Tablas técnicas que no son del dominio (pueden omitirse del ER o anotarse aparte):
`token_blacklist_outstandingtoken` y `token_blacklist_blacklistedtoken` (lista negra de refresh tokens).

Además, `mundo` agrega `mapa` (JSON: filas del laberinto).

## Requerimientos

- **RF-01 (autenticación): solo correos institucionales `@campusucc.edu.co`** para registrarse e
  ingresar (configurable con `DOMINIOS_CORREO_PERMITIDOS`); las cuentas de docente/administrador
  quedan exentas. Agregar al caso de uso "Registrarse" la validación del dominio.
- **RF-13 (recorrer laberinto)** se amplía: enemigos que patrullan, disparo con Espacio y empujón al
  ser alcanzado. La salida exige los 3 desafíos resueltos.
- **Nuevo RF-14 (vida y game over):** el jugador tiene 100 % de vida (5 corazones); cada golpe de
  enemigo quita 10 % (1 s de invulnerabilidad y el enemigo rebota). Sin vida: "Game over" y la opción
  Reiniciar, que devuelve al punto de partida y vuelve a cerrar los candados del laberinto
  (`POST /mundos/{id}/reiniciar/`). En el ER, `ProgresoMundo` gana `reiniciado_en` (fecha): los
  intentos NO se borran (historial para el docente); solo cuentan los aciertos posteriores. La XP
  ganada no se pierde y re-resolver un desafío no da XP de nuevo. Un mundo ya completado sigue completado.
- Privacidad en equipos compartidos: el borrador del código (localStorage) se borra al ingresar,
  registrarse y cerrar sesión, para que otra cuenta del mismo navegador no vea respuestas ajenas.

- **Cambio de diseño (ADR-0005): cada mundo es un laberinto** que el jugador recorre con el teclado;
  los obstáculos son desafíos y la salida desbloquea el siguiente mundo. Actualizar el caso de uso
  "Resolver desafío" (ahora se dispara al chocar con un obstáculo) y agregar "Recorrer laberinto" y
  "Completar mundo". Nuevo RF sugerido: **RF-13 Recorrer laberinto** (movimiento, cámara, minimapa).
- RF-05 (registrar intento) y el desbloqueo en cadena de RF-09 quedan implementados.
- **RF-06/RF-07/RF-08 (XP, nivel y logros) implementados, con reglas precisadas:**
  - XP de un desafío = `xp_base` + 5 si se acierta sin intentos previos − 2 por pista usada, sin bajar
    de la mitad de `xp_base`. Solo se gana la **primera** vez que se resuelve cada desafío.
  - Nivel n se alcanza con `12·n·(n−1)` XP (24, 72, 144, 240, 360…). La especificación sugería 50;
    se calibró para que el contenido actual (~300 XP) lleve al nivel 5–6. Constante en `config/juego.py`.
  - Puntos = XP ganada + 25 por cada mundo completado (una sola vez por mundo).
  - Logros: primer desafío, completar cada mundo y completar un mundo sin pistas. Solo los otorga el servidor.
  - Audio (RNF de multimedia): efectos de sonido CC0 con control de volumen y silencio (WCAG 1.4.2),
    recordado en el dispositivo; sin música de fondo por ahora.
  - Nuevo endpoint `GET /api/v1/logros/` (catálogo con obtenido/fecha). Las respuestas de intento y de
    completar mundo incluyen un objeto `recompensa`; el perfil incluye los umbrales del nivel.

- RF-01 (autenticación): se precisa que el refresh token viaja en cookie HttpOnly y el registro exige
  aceptar el aviso de privacidad (ADR-0003). Rutas con barra final: `/api/v1/auth/registro/`, etc.
- RF-02/RF-03: el contenido de un mundo bloqueado responde 403; el detalle de un desafío nunca incluye
  la solución de referencia (prueba automática lo verifica). IDs numéricos en las rutas.
- Requerimiento no funcional de seguridad: límites de intentos (login 10/min por IP y 5/min por correo;
  registro 5/hora por IP).

## Diagrama de clases

- Clases nuevas de dominio: `Rol`, `Avatar`, `Dificultad`, `ResultadoIntento`, `EstadoMundo`, `CriterioLogro` (enumeraciones).
- Servicio `cargar_contenido` (lee y valida los JSON de `content/`; valida con `ast` que la preparación de
  cada variante solo tenga asignaciones literales).
- Motor de ejecución (frontend): `EjecutorPython` (Web Worker + límite de tiempo), arnés Python
  (`ejecutar_solicitud`), `evaluarDesafio`, `traducirError`.

- Godot: `Laberinto` (lógica), `ContratoLaberinto`, `EscenaLaberinto`, `JugadorLaberinto`, `Minimapa`.
- Backend: `laberinto.problemas_del_mapa` (BFS), `servicios.registrar_intento`, `servicios.completar_mundo`.
- Gamificación: `Recompensa` (valor devuelto al navegador) y el servicio `gamificacion.servicios`
  (`xp_por_desafio`, `nivel_para`, `al_resolver_desafio`, `al_completar_mundo`). En el ER no cambia nada:
  `Perfil.experiencia/puntos/nivel`, `IntentoDesafio.xp_otorgada` y `UsuarioLogro` ya existían.

## Arquitectura / componentes / despliegue

- Las reglas AST viven en `compartido/python/` y las usan navegador y servidor (diagrama de componentes).
- Diagrama de secuencia nuevo: chocar con obstáculo → modal del desafío → POST intento → obstáculo resuelto en Godot.

- Arquitectura híbrida (ADR-0002): React (plataforma) + Godot 4.7 exportado a web (escenas del juego) + Django REST.
- Comunicación React ↔ Godot por `ColaDeAcciones` en JSON mediante `JavaScriptBridge`.
- Django 5.2 LTS en lugar de la versión más reciente (ADR-0001).
- Ejecución del código del estudiante en el navegador con Pyodide 314 (Python 3.14) en un Web Worker,
  servido localmente; el servidor nunca ejecuta código (ADR-0004). Debe aparecer en el diagrama de
  componentes y en el de secuencia de "Ejecutar".
- Node.js 24 LTS para el frontend (exigido por React Router 8).
