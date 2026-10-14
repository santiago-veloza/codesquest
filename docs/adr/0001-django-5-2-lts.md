# ADR-0001: Usar Django 5.2 LTS en lugar de Django 6.x

- **Estado:** aceptado
- **Fecha:** 2026-10-04

## Contexto
La versión más reciente de Django es 6.1. La autenticación del proyecto depende de
`djangorestframework-simplejwt` (5.5.1), cuyo paquete en PyPI solo declara compatibilidad con
Django 4.2–5.2. `djangorestframework` 3.18 y `drf-spectacular` 0.30 sí declaran soporte para 5.2.

## Decisión
Usar **Django 5.2 LTS** (rango `~=5.2.17`) con **Python 3.13** (soportado oficialmente por Django 5.2).

## Alternativas consideradas
- **Django 6.1:** más nuevo, pero arriesga incompatibilidades no declaradas en la librería de JWT,
  justo en la parte más sensible (seguridad).
- **Python 3.14:** Django 5.2 lo admite solo desde parches recientes; 3.13 tiene mayor soporte en
  el ecosistema y coincide con la instalación local del equipo.

## Consecuencias
- LTS: parches de seguridad hasta abril de 2028, más allá de la duración del proyecto.
- Revisar en el Sprint 5 si simplejwt ya soporta Django 6.x antes de considerar migrar.
