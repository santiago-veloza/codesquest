"""Lógica de cuentas y sesiones. Las vistas solo traducen HTTP <-> estas funciones."""

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from config import juego

from .excepciones import CredencialesInvalidas, SesionInvalida
from .models import Perfil, Usuario, correo_institucional, normalizar_correo


@transaction.atomic
def registrar_usuario(*, email: str, password: str, apodo: str, avatar: str) -> Usuario:
    """Crea la cuenta y su perfil, dejando evidencia del consentimiento (Ley 1581)."""
    usuario = Usuario.objects.create_user(
        email=email,
        password=password,
        fecha_aceptacion_privacidad=timezone.now(),
        version_aviso_privacidad=settings.VERSION_AVISO_PRIVACIDAD,
    )
    Perfil.objects.create(usuario=usuario, apodo=apodo, avatar=avatar)
    return usuario


def autenticar(request, *, email: str, password: str) -> Usuario:
    # authenticate() también ejecuta el hasher cuando el correo no existe: el tiempo de respuesta
    # no delata qué cuentas existen. Cuentas inactivas devuelven None igual que una clave errada.
    usuario = authenticate(request, email=normalizar_correo(email), password=password)
    if usuario is None:
        raise CredencialesInvalidas()
    # Los estudiantes solo con correo institucional. Docentes/administradores quedan exentos para no
    # perder acceso (p. ej. cuentas creadas con createsuperuser). Mismo mensaje: no revela nada.
    if not usuario.es_docente and not correo_institucional(usuario.email):
        raise CredencialesInvalidas()
    return usuario


def emitir_tokens(usuario: Usuario) -> tuple[str, str]:
    """Devuelve (access, refresh) y registra el último inicio de sesión."""
    refresh = RefreshToken.for_user(usuario)
    update_last_login(None, usuario)
    return str(refresh.access_token), str(refresh)


def renovar_tokens(refresh: str | None) -> tuple[str, str]:
    """Rota el refresh: entrega (access, refresh nuevo) y bloquea el anterior."""
    if not refresh:
        raise SesionInvalida()
    serializer = TokenRefreshSerializer(data={"refresh": refresh})
    try:
        serializer.is_valid(raise_exception=True)
    # ObjectDoesNotExist: simplejwt 5.5.1 no controla el caso de un usuario borrado (daría 500).
    except (TokenError, AuthenticationFailed, ValidationError, ObjectDoesNotExist) as error:
        raise SesionInvalida() from error
    return serializer.validated_data["access"], serializer.validated_data["refresh"]


def cerrar_sesion(refresh: str | None) -> None:
    """Bloquea el refresh para que no se pueda volver a usar. Si ya no es válido, no hay nada que hacer."""
    if not refresh:
        return
    try:
        RefreshToken(refresh).blacklist()
    except TokenError:
        pass


def obtener_perfil(usuario: Usuario) -> Perfil:
    """Cuentas creadas fuera del registro (p. ej. createsuperuser) reciben un perfil al primer uso."""
    apodo = usuario.email.split("@")[0][: juego.LARGO_MAXIMO_APODO]
    perfil, _ = Perfil.objects.get_or_create(usuario=usuario, defaults={"apodo": apodo})
    return perfil
