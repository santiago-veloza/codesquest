from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Logro


class LogroDelUsuarioSerializer(serializers.ModelSerializer):
    """Logro del catálogo con su estado para el usuario (`fechas`: {logro_id: fecha} en el contexto)."""

    obtenido = serializers.SerializerMethodField()
    fecha_obtencion = serializers.SerializerMethodField()

    class Meta:
        model = Logro
        fields = ["codigo", "nombre", "descripcion", "icono", "obtenido", "fecha_obtencion"]

    def get_obtenido(self, logro) -> bool:
        return logro.id in self.context["fechas"]

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_fecha_obtencion(self, logro):
        fecha = self.context["fechas"].get(logro.id)
        return serializers.DateTimeField().to_representation(fecha) if fecha else None
