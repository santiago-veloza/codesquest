"""Piezas de seguridad de la autenticación: cookie del refresh, cabecera anti-CSRF y throttling."""

from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.settings import api_settings as jwt_settings

from .models import normalizar_correo

# --- Cookie del refresh token ---


def poner_cookie_refresh(respuesta, refresh: str) -> None:
    cookie = settings.COOKIE_REFRESH
    respuesta.set_cookie(
        cookie["nombre"],
        refresh,
        max_age=int(jwt_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        path=cookie["ruta"],
        secure=cookie["secure"],
        httponly=True,
        samesite=cookie["samesite"],
    )


def borrar_cookie_refresh(respuesta) -> None:
    cookie = settings.COOKIE_REFRESH
    respuesta.delete_cookie(cookie["nombre"], path=cookie["ruta"], samesite=cookie["samesite"])


def leer_cookie_refresh(request) -> str | None:
    return request.COOKIES.get(settings.COOKIE_REFRESH["nombre"])


# --- Anti-CSRF para las vistas que usan la cookie ---


class RequiereCabeceraCliente(BasePermission):
    """Exige la cabecera propia del frontend. Un formulario o sitio externo no puede enviarla
    sin una petición CORS previa, que el backend rechaza para orígenes no permitidos."""

    message = "Solicitud no permitida."

    def has_permission(self, request, view):
        cabecera = settings.CABECERA_CLIENTE
        return request.headers.get(cabecera["nombre"]) == cabecera["valor"]


# --- Throttling ---


class _LimitePorIP(SimpleRateThrottle):
    """Límite por IP, se haya iniciado sesión o no (la tasa sale de DEFAULT_THROTTLE_RATES[scope])."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LimiteLoginPorIP(_LimitePorIP):
    scope = "auth_login"


class LimiteRegistro(_LimitePorIP):
    scope = "auth_registro"


class LimiteRefresh(_LimitePorIP):
    scope = "auth_refresh"


class LimiteLoginPorCorreo(SimpleRateThrottle):
    """Frena ataques contra una misma cuenta repartidos entre muchas IPs."""

    scope = "auth_login_correo"

    def get_cache_key(self, request, view):
        correo = request.data.get("email") if hasattr(request, "data") else None
        if not isinstance(correo, str) or not correo.strip():
            return None  # Sin correo no hay a quién proteger; la validación responderá 400.
        return self.cache_format % {"scope": self.scope, "ident": normalizar_correo(correo)}
