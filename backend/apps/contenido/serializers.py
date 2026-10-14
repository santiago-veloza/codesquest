"""Serializers de contenido. REGLA DE SEGURIDAD: `solucion_referencia` y `errores_tipicos` nunca se
envían al cliente (ADR-0004). Por eso se listan los campos permitidos, nunca `__all__`.
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.progreso.models import EstadoMundo

from .models import Desafio, Mundo


class MundoSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()
    porcentaje = serializers.SerializerMethodField()

    class Meta:
        model = Mundo
        fields = ["id", "codigo", "orden", "nombre", "conceptos", "descripcion", "estado", "porcentaje"]

    def _estado(self, mundo):
        return self.context["estados"][mundo.id]

    @extend_schema_field(serializers.ChoiceField(choices=EstadoMundo.choices))
    def get_estado(self, mundo) -> str:
        return self._estado(mundo).estado

    def get_porcentaje(self, mundo) -> int:
        return self._estado(mundo).porcentaje


class ObstaculoSerializer(serializers.Serializer):
    simbolo = serializers.CharField(help_text="Dígito del mapa (orden del desafío).")
    desafio_id = serializers.IntegerField()
    codigo = serializers.CharField()
    titulo = serializers.CharField()
    dificultad = serializers.CharField()
    resuelto = serializers.BooleanField()


class MundoLaberintoSerializer(MundoSerializer):
    """El mundo con su laberinto. El mapa no revela nada secreto: es lo que el jugador va a recorrer."""

    mapa = serializers.ListField(child=serializers.CharField())
    obstaculos = serializers.SerializerMethodField()

    class Meta(MundoSerializer.Meta):
        fields = [*MundoSerializer.Meta.fields, "mapa", "obstaculos"]

    @extend_schema_field(ObstaculoSerializer(many=True))
    def get_obstaculos(self, mundo) -> list[dict]:
        resueltos = self.context["resueltos"]
        return [
            {
                "simbolo": str(d.orden),
                "desafio_id": d.id,
                "codigo": d.codigo,
                "titulo": d.titulo,
                "dificultad": d.dificultad,
                "resuelto": d.id in resueltos,
            }
            for d in sorted(mundo.desafios.all(), key=lambda d: d.orden)
        ]


class DesafioResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Desafio
        fields = ["id", "codigo", "orden", "titulo", "dificultad", "xp_base"]


class MundoReferenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mundo
        fields = ["id", "codigo", "orden"]


class DesafioDetalleSerializer(serializers.ModelSerializer):
    """Lo necesario para resolver y evaluar en el navegador, y nada más."""

    mundo = MundoReferenciaSerializer(read_only=True)
    funciones_juego = serializers.ListField(source="mundo.funciones_juego", child=serializers.CharField())

    class Meta:
        model = Desafio
        fields = [
            "id",
            "codigo",
            "orden",
            "titulo",
            "dificultad",
            "enunciado",
            "codigo_base",
            "pistas",
            "pruebas",
            "variantes",
            "xp_base",
            "mundo",
            "funciones_juego",
        ]
