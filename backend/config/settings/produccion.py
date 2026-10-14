"""Producción (detrás de Nginx con HTTPS). Se completa en el Sprint 5."""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# Nginx termina HTTPS y avisa con esta cabecera.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("DJANGO_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("DJANGO_HSTS_SEGUNDOS", default=60 * 60 * 24 * 30)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# HSTS preload no se activa: inscribir el dominio en la lista de los navegadores es casi irreversible.
SILENCED_SYSTEM_CHECKS = ["security.W021"]
