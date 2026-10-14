"""Pruebas automáticas (pytest).

Usa PostgreSQL igual que desarrollo, para detectar los mismos problemas que en producción.
"""

from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK

DEBUG = False

# Hasher rápido solo para pruebas: acelera la creación de usuarios. Nunca en producción.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Throttling general alto para no interferir; los límites de autenticación se mantienen reales
# porque las pruebas de seguridad los verifican.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
        "anon": "10000/min",
        "user": "10000/min",
    },
}
