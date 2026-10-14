import logging

from django.db import DatabaseError, connection
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .excepciones import MENSAJE_ERROR_INTERNO, cuerpo_error

logger = logging.getLogger(__name__)

ESTADO_OK = "ok"
ESTADO_ERROR = "error"


class VistaSalud(APIView):
    """Indica si la API y la base de datos responden. Lo usan Docker y el monitoreo."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Estado del servicio",
        responses=inline_serializer(
            "Salud",
            fields={"estado": serializers.CharField(), "base_de_datos": serializers.CharField()},
        ),
    )
    def get(self, request):
        if _base_de_datos_disponible():
            return Response({"estado": ESTADO_OK, "base_de_datos": ESTADO_OK})
        return Response(
            {"estado": ESTADO_ERROR, "base_de_datos": ESTADO_ERROR},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def _base_de_datos_disponible() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except DatabaseError:
        logger.warning("La base de datos no responde en la verificación de salud.")
        return False


# --- Respuestas JSON para errores fuera de DRF (rutas inexistentes, fallos globales) ---


def no_encontrado(request, exception=None):
    return JsonResponse(cuerpo_error("no_encontrado", "El recurso solicitado no existe."), status=404)


def error_servidor(request):
    return JsonResponse(cuerpo_error("error_interno", MENSAJE_ERROR_INTERNO), status=500)
