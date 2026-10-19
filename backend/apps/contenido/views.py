from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response

from apps.progreso.acceso import exigir_mundo_accesible
from apps.progreso.servicios import desafios_resueltos, estados_de_mundos

from .models import Desafio, Mundo
from .serializers import (
    DesafioDetalleSerializer,
    DesafioResumenSerializer,
    MundoLaberintoSerializer,
    MundoSerializer,
)


@extend_schema(summary="Mundos con su estado para el usuario")
class VistaMundos(ListAPIView):
    serializer_class = MundoSerializer
    pagination_class = None  # Son cinco mundos: paginarlos solo complica al cliente.

    def get_queryset(self):
        return Mundo.objects.filter(activo=True).order_by("orden")

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "estados": estados_de_mundos(self.request.user)}


@extend_schema(summary="Laberinto de un mundo desbloqueado, con sus obstáculos y cuáles están resueltos")
class VistaMundo(RetrieveAPIView):
    serializer_class = MundoLaberintoSerializer
    queryset = Mundo.objects.filter(activo=True).prefetch_related("desafios")

    def retrieve(self, request, *args, **kwargs):
        mundo = self.get_object()
        exigir_mundo_accesible(request.user, mundo)
        contexto = {
            **self.get_serializer_context(),
            "estados": estados_de_mundos(request.user),
            "resueltos": desafios_resueltos(request.user, mundo),
        }
        return Response(self.get_serializer(mundo, context=contexto).data)


@extend_schema(summary="Desafíos de un mundo desbloqueado")
class VistaDesafiosDeMundo(ListAPIView):
    serializer_class = DesafioResumenSerializer
    pagination_class = None

    def get_queryset(self):
        mundo = get_object_or_404(Mundo, pk=self.kwargs["pk"], activo=True)
        exigir_mundo_accesible(self.request.user, mundo)
        return mundo.desafios.order_by("orden")


@extend_schema(summary="Detalle de un desafío (sin la solución de referencia)")
class VistaDesafio(RetrieveAPIView):
    serializer_class = DesafioDetalleSerializer
    queryset = Desafio.objects.select_related("mundo").filter(mundo__activo=True)

    def get_object(self):
        desafio = super().get_object()
        exigir_mundo_accesible(self.request.user, desafio.mundo)
        return desafio
