"""Errores de autenticación con mensajes que no revelan si una cuenta existe.

Heredan de APIException (no de AuthenticationFailed) para fijar el 401 de forma explícita: DRF
convierte AuthenticationFailed en 403 cuando la vista no tiene autenticadores.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class CredencialesInvalidas(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Correo o contraseña incorrectos."
    default_code = "credenciales_invalidas"


class SesionInvalida(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Tu sesión expiró o no es válida. Inicia sesión de nuevo."
    default_code = "sesion_invalida"
