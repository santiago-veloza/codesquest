from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.contenido.models import Desafio, Mundo

from . import servicios
from .acceso import exigir_mundo_accesible
from .serializers import (
    CompletarMundoRespuestaSerializer,
    IntentoEntradaSerializer,
    IntentoRespuestaSerializer,
    ProgresoSerializer,
)


class MundoSinTerminar(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Aún faltan obstáculos por resolver en este laberinto."
    default_code = "mundo_incompleto"


class VistaIntentos(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "intentos"

    @extend_schema(
        summary="Registrar un intento de un desafío",
        request=IntentoEntradaSerializer,
        responses={201: IntentoRespuestaSerializer},
    )
    def post(self, request, pk):
        desafio = get_object_or_404(Desafio.objects.select_related("mundo"), pk=pk, mundo__activo=True)
        exigir_mundo_accesible(request.user, desafio.mundo)
        entrada = IntentoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        registro = servicios.registrar_intento(request.user, desafio, entrada.validated_data)
        progreso = registro.progreso
        progreso.total_desafios = registro.total_desafios
        respuesta = {
            "resultado": registro.intento.resultado,
            "desafio_resuelto": registro.desafio_resuelto,
            "xp_otorgada": registro.intento.xp_otorgada,
            "progreso": progreso,
            "recompensa": registro.recompensa,
        }
        return Response(IntentoRespuestaSerializer(respuesta).data, status=status.HTTP_201_CREATED)


class VistaCompletarMundo(APIView):
    @extend_schema(
        summary="Completar el laberinto (todos los obstáculos resueltos) y desbloquear el siguiente mundo",
        request=None,
        responses={200: CompletarMundoRespuestaSerializer},
    )
    def post(self, request, pk):
        mundo = get_object_or_404(Mundo, pk=pk, activo=True)
        exigir_mundo_accesible(request.user, mundo)
        try:
            siguiente, recompensa = servicios.completar_mundo(request.user, mundo)
        except servicios.MundoIncompleto as error:
            raise MundoSinTerminar() from error
        datos = {
            "siguiente_mundo": {"id": siguiente.id, "nombre": siguiente.nombre} if siguiente else None,
            "recompensa": recompensa,
        }
        return Response(CompletarMundoRespuestaSerializer(datos).data)


class VistaReiniciarMundo(APIView):
    @extend_schema(
        summary="Reiniciar el laberinto tras un game over (los obstáculos vuelven a aparecer)",
        request=None,
        responses={200: ProgresoSerializer},
    )
    def post(self, request, pk):
        mundo = get_object_or_404(Mundo, pk=pk, activo=True)
        exigir_mundo_accesible(request.user, mundo)
        progreso, total = servicios.reiniciar_mundo(request.user, mundo)
        progreso.total_desafios = total
        return Response(ProgresoSerializer(progreso).data)
