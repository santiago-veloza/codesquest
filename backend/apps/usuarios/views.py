from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import servicios
from .seguridad import (
    LimiteLoginPorCorreo,
    LimiteLoginPorIP,
    LimiteRefresh,
    LimiteRegistro,
    RequiereCabeceraCliente,
    borrar_cookie_refresh,
    leer_cookie_refresh,
    poner_cookie_refresh,
)
from .serializers import (
    AccessSerializer,
    LoginSerializer,
    PerfilSerializer,
    RegistroSerializer,
    SesionSerializer,
)

CABECERA_CLIENTE_DOC = OpenApiParameter(
    "X-CodeQuest-Cliente", str, OpenApiParameter.HEADER, required=True, description='Debe valer "web".'
)


def _respuesta_sesion(usuario, estado) -> Response:
    """Access en el cuerpo (React lo guarda en memoria) y refresh en cookie HttpOnly."""
    access, refresh = servicios.emitir_tokens(usuario)
    perfil = PerfilSerializer(servicios.obtener_perfil(usuario)).data
    respuesta = Response({"access": access, "perfil": perfil}, status=estado)
    poner_cookie_refresh(respuesta, refresh)
    return respuesta


class VistaRegistro(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LimiteRegistro]

    @extend_schema(summary="Crear cuenta", request=RegistroSerializer, responses={201: SesionSerializer})
    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        usuario = servicios.registrar_usuario(
            email=datos["email"], password=datos["password"], apodo=datos["apodo"], avatar=datos["avatar"]
        )
        return _respuesta_sesion(usuario, status.HTTP_201_CREATED)


class VistaLogin(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LimiteLoginPorIP, LimiteLoginPorCorreo]

    @extend_schema(summary="Iniciar sesión", request=LoginSerializer, responses={200: SesionSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = servicios.autenticar(request, **serializer.validated_data)
        return _respuesta_sesion(usuario, status.HTTP_200_OK)


class VistaRefresh(APIView):
    permission_classes = [RequiereCabeceraCliente]
    authentication_classes = []
    throttle_classes = [LimiteRefresh]

    @extend_schema(
        summary="Renovar el access token (usa la cookie HttpOnly)",
        request=None,
        parameters=[CABECERA_CLIENTE_DOC],
        responses={200: AccessSerializer},
    )
    def post(self, request):
        access, refresh = servicios.renovar_tokens(leer_cookie_refresh(request))
        respuesta = Response({"access": access})
        poner_cookie_refresh(respuesta, refresh)
        return respuesta


class VistaLogout(APIView):
    permission_classes = [RequiereCabeceraCliente]
    authentication_classes = []

    @extend_schema(
        summary="Cerrar sesión", request=None, parameters=[CABECERA_CLIENTE_DOC], responses={204: None}
    )
    def post(self, request):
        servicios.cerrar_sesion(leer_cookie_refresh(request))
        respuesta = Response(status=status.HTTP_204_NO_CONTENT)
        borrar_cookie_refresh(respuesta)
        return respuesta


class VistaPerfil(RetrieveUpdateAPIView):
    """Perfil del usuario autenticado. No recibe id: nadie puede ver o editar el perfil de otro."""

    serializer_class = PerfilSerializer
    http_method_names = ["get", "patch", "options"]

    def get_object(self):
        return servicios.obtener_perfil(self.request.user)
