import pytest
from django.http import Http404
from rest_framework import exceptions
from rest_framework.permissions import AllowAny
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

fabrica = APIRequestFactory()


def _vista_que_lanza(excepcion):
    class VistaDePrueba(APIView):
        # Conserva la autenticación JWT por defecto: sin autenticadores, DRF convierte 401 en 403.
        permission_classes = [AllowAny]

        def get(self, request):
            raise excepcion

    return VistaDePrueba.as_view()


def _error(excepcion):
    respuesta = _vista_que_lanza(excepcion)(fabrica.get("/prueba/"))
    respuesta.render()
    return respuesta.status_code, respuesta.data["error"]


def test_error_de_validacion_incluye_detalles_por_campo():
    estado, error = _error(exceptions.ValidationError({"email": ["Correo inválido."]}))

    assert estado == 400
    assert error["codigo"] == "datos_invalidos"
    assert error["detalles"] == {"email": ["Correo inválido."]}


@pytest.mark.parametrize(
    ("excepcion", "estado_esperado", "codigo_esperado"),
    [
        (exceptions.NotAuthenticated(), 401, "no_autenticado"),
        (exceptions.PermissionDenied(), 403, "sin_permiso"),
        (Http404(), 404, "no_encontrado"),
        (exceptions.Throttled(wait=30), 429, "demasiadas_solicitudes"),
    ],
)
def test_errores_conocidos_tienen_formato_uniforme(excepcion, estado_esperado, codigo_esperado):
    estado, error = _error(excepcion)

    assert estado == estado_esperado
    assert error["codigo"] == codigo_esperado
    assert error["mensaje"]
    assert "detalles" not in error


def test_error_inesperado_responde_500_sin_filtrar_la_traza():
    estado, error = _error(RuntimeError("secreto interno: contraseña=123"))

    assert estado == 500
    assert error["codigo"] == "error_interno"
    assert "secreto" not in error["mensaje"]


@pytest.mark.django_db
def test_ruta_inexistente_responde_json_uniforme(client):
    respuesta = client.get("/api/v1/no-existe/")

    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["codigo"] == "no_encontrado"
