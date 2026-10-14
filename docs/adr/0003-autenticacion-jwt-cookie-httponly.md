# ADR-0003: Autenticación con JWT (access en memoria, refresh en cookie HttpOnly)

- **Estado:** aceptado
- **Fecha:** 2026-10-04

## Contexto
La API es consumida por una SPA (React). Hay que evitar que un XSS robe una sesión larga y, a la vez,
no abrir la puerta a CSRF por usar cookies.

## Decisión
- **Access token** (15 min) en el cuerpo de la respuesta; el frontend lo guarda solo en memoria.
- **Refresh token** (7 días) en cookie `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth/`,
  `Secure` fuera de desarrollo. JavaScript no puede leerla y solo viaja a refresh/logout.
- **Rotación + lista negra** (`token_blacklist` de simplejwt): cada refresh entrega uno nuevo y el
  anterior queda inválido; reutilizar uno viejo (robado) falla. Logout lo invalida.
- **Mismo origen**: en desarrollo Vite hace de proxy de `/api`; en producción, Nginx. Así
  `SameSite=Strict` no rompe el flujo.
- **Anti-CSRF**: refresh y logout exigen la cabecera `X-CodeQuest-Cliente: web`. Un sitio externo no
  puede enviarla sin preflight CORS, que el backend rechaza para orígenes no permitidos.
- **Fuerza bruta**: límite de login por IP (10/min) y por correo (5/min), registro 5/hora por IP.
- **Sin enumeración en el login**: mismo mensaje y código (`credenciales_invalidas`) para correo
  inexistente, clave errada o cuenta inactiva; `authenticate()` iguala tiempos ejecutando el hasher.

## Alternativas consideradas
- **Tokens en localStorage**: más simple, pero cualquier XSS roba la sesión completa.
- **Sesiones de Django con cookie**: válidas, pero el proyecto fijó JWT; además la API queda lista
  para otros clientes.

## Consecuencias y limitaciones conocidas
- **El registro revela si un correo ya existe** (responde "No es posible registrarse con este
  correo"). Evitarlo de verdad exige verificación por email (enviar un enlace), fuera del MVP.
  Mitigación: límite estricto de registros por IP. Evolución: verificación de correo.
- **El throttling usa la caché por defecto (memoria del proceso)**. Con varios procesos en
  producción cada uno contaría por separado. En el Sprint 5 se configura una caché compartida
  (base de datos o Redis) para el despliegue.
- simplejwt 5.5.1 no controla el refresh de un usuario borrado (lanzaría un 500); el servicio
  `renovar_tokens` lo captura y responde 401 (cubierto por prueba).
