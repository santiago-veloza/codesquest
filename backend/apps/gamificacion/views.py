from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView

from .models import Logro, UsuarioLogro
from .serializers import LogroDelUsuarioSerializer


@extend_schema(summary="Catálogo de logros con los que ya obtuvo el usuario")
class VistaLogros(ListAPIView):
    serializer_class = LogroDelUsuarioSerializer
    pagination_class = None  # Son pocos logros: paginarlos solo complica al cliente.
    queryset = Logro.objects.all()

    def get_serializer_context(self):
        fechas = dict(
            UsuarioLogro.objects.filter(usuario=self.request.user).values_list("logro_id", "fecha_obtencion")
        )
        return {**super().get_serializer_context(), "fechas": fechas}
