from rest_framework import serializers

from config import juego

from .models import ProgresoMundo, ResultadoIntento


class IntentoEntradaSerializer(serializers.Serializer):
    """Lo que envía el navegador tras evaluar el código. XP y progreso los decide el servidor."""

    codigo_enviado = serializers.CharField(max_length=juego.LARGO_MAXIMO_CODIGO, trim_whitespace=False)
    resultado = serializers.ChoiceField(choices=ResultadoIntento.choices)
    tipo_error = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    pistas_usadas = serializers.IntegerField(min_value=0, max_value=juego.PISTAS_POR_DESAFIO, default=0)
    tiempo_ms = serializers.IntegerField(min_value=0, max_value=juego.TIEMPO_MAXIMO_INTENTO_MS)


class ProgresoSerializer(serializers.ModelSerializer):
    total_desafios = serializers.IntegerField()

    class Meta:
        model = ProgresoMundo
        fields = ["estado", "porcentaje", "desafios_completados", "total_desafios"]


class LogroResumenSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    descripcion = serializers.CharField()
    icono = serializers.CharField()


class RecompensaSerializer(serializers.Serializer):
    """XP, nivel, puntos y logros decididos por el servidor tras un evento del juego."""

    xp_otorgada = serializers.IntegerField()
    puntos_otorgados = serializers.IntegerField()
    experiencia = serializers.IntegerField()
    puntos = serializers.IntegerField()
    nivel = serializers.IntegerField()
    subio_de_nivel = serializers.BooleanField()
    logros_nuevos = LogroResumenSerializer(many=True)
    experiencia_nivel_actual = serializers.IntegerField()
    experiencia_siguiente_nivel = serializers.IntegerField()


class IntentoRespuestaSerializer(serializers.Serializer):
    resultado = serializers.ChoiceField(choices=ResultadoIntento.choices)
    desafio_resuelto = serializers.BooleanField()
    xp_otorgada = serializers.IntegerField()
    progreso = ProgresoSerializer()
    recompensa = RecompensaSerializer()


class MundoSiguienteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nombre = serializers.CharField()


class CompletarMundoRespuestaSerializer(serializers.Serializer):
    siguiente_mundo = MundoSiguienteSerializer(allow_null=True)
    recompensa = RecompensaSerializer()
