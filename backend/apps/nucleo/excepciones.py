"""Formato uniforme de errores de la API.

Toda respuesta de error tiene la forma:
    {"error": {"codigo": "datos_invalidos", "mensaje": "...", "detalles": {...}}}
El frontend decide qué mostrar a partir de "codigo"; "mensaje" está en español.
"""

import logging

from django.core.exceptions import PermissionDenied as PermisoDenegadoDjango
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler, set_rollback

logger = logging.getLogger(__name__)

MENSAJE_DATOS_INVALIDOS = "Los datos enviados no son válidos."
MENSAJE_ERROR_INTERNO = "Ocurrió un error inesperado. Intenta de nuevo más tarde."

# El orden importa: se usa la primera clase que coincida (las subclases van antes).
CODIGOS_POR_EXCEPCION = (
    (exceptions.ValidationError, "datos_invalidos"),
    (exceptions.NotAuthenticated, "no_autenticado"),
    (exceptions.AuthenticationFailed, "autenticacion_fallida"),
    (exceptions.PermissionDenied, "sin_permiso"),
    (exceptions.NotFound, "no_encontrado"),
    (exceptions.MethodNotAllowed, "metodo_no_permitido"),
    (exceptions.Throttled, "demasiadas_solicitudes"),
)


def cuerpo_error(codigo: str, mensaje: str, detalles=None) -> dict:
    error = {"codigo": codigo, "mensaje": mensaje}
    if detalles:
        error["detalles"] = detalles
    return {"error": error}


def manejador_errores(exc, context):
    exc = _convertir_excepcion_django(exc)
    respuesta = exception_handler(exc, context)

    if respuesta is None:
        # Error no controlado: se registra en el servidor, pero al cliente nunca se le envía la traza.
        logger.exception("Error no controlado en %s", context.get("view").__class__.__name__)
        set_rollback()
        return Response(
            cuerpo_error("error_interno", MENSAJE_ERROR_INTERNO),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    respuesta.data = cuerpo_error(_codigo(exc), _mensaje(exc), _detalles(exc, respuesta.data))
    return respuesta


def _convertir_excepcion_django(exc):
    if isinstance(exc, Http404):
        return exceptions.NotFound()
    if isinstance(exc, PermisoDenegadoDjango):
        return exceptions.PermissionDenied()
    return exc


def _codigo(exc) -> str:
    # Un código explícito (p. ej. "credenciales_invalidas") gana sobre el genérico de la clase.
    codigo_propio = getattr(exc.detail, "code", None)
    if codigo_propio and codigo_propio != getattr(exc, "default_code", None):
        return codigo_propio
    for clase, codigo in CODIGOS_POR_EXCEPCION:
        if isinstance(exc, clase):
            return codigo
    return getattr(exc, "default_code", "error")


def _mensaje(exc) -> str:
    if isinstance(exc, exceptions.ValidationError):
        return MENSAJE_DATOS_INVALIDOS
    if isinstance(exc.detail, str):
        return str(exc.detail)
    return str(exc.default_detail)


def _detalles(exc, datos):
    # Solo los errores de validación tienen detalles útiles por campo.
    return datos if isinstance(exc, exceptions.ValidationError) else None
