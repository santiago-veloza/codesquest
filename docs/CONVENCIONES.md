# Convenciones del equipo

## Ramas

- `main`: siempre estable y demostrable. No se trabaja directamente sobre ella.
- Una rama por funcionalidad: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `chore/<tema>`.
  Ejemplo: `feat/autenticacion`, `feat/motor-ejecucion`.
- Se integra a `main` con Pull Request revisado por el compañero.

## Commits — Conventional Commits

Formato: `tipo(alcance): descripción en imperativo y en español`.

| Tipo       | Uso                                         |
|------------|---------------------------------------------|
| `feat`     | Funcionalidad nueva                         |
| `fix`      | Corrección de error                         |
| `docs`     | Solo documentación                          |
| `test`     | Pruebas                                     |
| `refactor` | Cambio interno sin alterar comportamiento   |
| `chore`    | Configuración, dependencias, herramientas   |
| `content`  | Mundos, desafíos, diálogos (datos)          |

Ejemplo: `feat(usuarios): agrega registro con validación de contraseña`.
Commits pequeños: un cambio lógico por commit.

## Nombres

- Modelos, campos y endpoints en español `snake_case`, coherentes con el diagrama entidad-relación
  (`intento_desafio`, `progreso_mundo`).
- Componentes de React en `PascalCase` (`EscenaMundo.tsx`); hooks con prefijo `use` (`useProgreso`).
- Comentarios y mensajes al usuario en español.

## Reglas de calidad

- Sin números ni textos "mágicos": las constantes de juego (XP, umbrales, tiempos) van en un único
  archivo de configuración.
- El contenido del juego vive en `backend/content/`, no dentro de componentes.
- Cada funcionalidad se entrega con sus pruebas.
- Nunca se suben `.env`, claves ni datos personales.

## Decisiones de arquitectura (ADR)

Cada decisión relevante se registra en `docs/adr/NNNN-titulo.md` usando `docs/adr/plantilla.md`.
Las capas del código y sus reglas están en `docs/adr/0006-arquitectura-en-capas.md`: si una prueba
de arquitectura falla, se corrige la dependencia en lugar de agregar una excepción.
