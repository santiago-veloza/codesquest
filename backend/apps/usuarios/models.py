from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from config import juego


class Rol(models.TextChoices):
    ESTUDIANTE = "estudiante", "Estudiante"
    DOCENTE_ADMIN = "docente_admin", "Docente / administrador"


class GestorUsuarios(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **campos):
        campos.setdefault("is_staff", False)
        campos.setdefault("is_superuser", False)
        return self._crear(email, password, **campos)

    def create_superuser(self, email, password=None, **campos):
        campos.setdefault("is_staff", True)
        campos.setdefault("is_superuser", True)
        campos.setdefault("rol", Rol.DOCENTE_ADMIN)
        if campos["is_staff"] is not True or campos["is_superuser"] is not True:
            raise ValueError("Un superusuario debe tener is_staff=True e is_superuser=True.")
        return self._crear(email, password, **campos)

    def _crear(self, email, password, **campos):
        if not email:
            raise ValueError("El correo electrónico es obligatorio.")
        usuario = self.model(email=normalizar_correo(email), **campos)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario


def normalizar_correo(email: str) -> str:
    """Correo en minúsculas y sin espacios: Ana@Correo.com y ana@correo.com son la misma cuenta."""
    return email.strip().lower()


def correo_institucional(email: str) -> bool:
    """¿El correo pertenece a un dominio permitido (settings.DOMINIOS_CORREO_PERMITIDOS)?"""
    dominio = normalizar_correo(email).rpartition("@")[2]
    return dominio in {d.lower() for d in settings.DOMINIOS_CORREO_PERMITIDOS}


class Usuario(AbstractBaseUser, PermissionsMixin):
    """Cuenta de acceso. Se inicia sesión con el correo; el apodo y avatar viven en Perfil.

    Los campos is_active/is_staff conservan el nombre en inglés porque el sistema de
    autenticación de Django los requiere con ese nombre.
    """

    email = models.EmailField("correo electrónico", unique=True)
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.ESTUDIANTE)
    is_active = models.BooleanField("activo", default=True)
    is_staff = models.BooleanField("acceso al admin", default=False)
    fecha_registro = models.DateTimeField(default=timezone.now)
    # Ley 1581 de 2012: evidencia del consentimiento (cuándo y qué versión del aviso aceptó).
    fecha_aceptacion_privacidad = models.DateTimeField(null=True, blank=True)
    version_aviso_privacidad = models.CharField(max_length=10, blank=True)

    objects = GestorUsuarios()

    EMAIL_FIELD = "email"
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "usuario"
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        constraints = [
            # Refuerzo en la base de datos: no puede haber dos correos que solo difieran en mayúsculas.
            models.UniqueConstraint(Lower("email"), name="usuario_email_unico_sin_mayusculas"),
        ]

    def __str__(self):
        return self.email

    @property
    def es_docente(self) -> bool:
        return self.rol == Rol.DOCENTE_ADMIN


class Avatar(models.TextChoices):
    # Tres diseños originales; el arte se especifica en ASSETS_TODO.md.
    BYTE = "byte", "Byte"
    PIXEL = "pixel", "Pixel"
    CHISPA = "chispa", "Chispa"


class Perfil(models.Model):
    """Datos de juego del usuario. XP, puntos y nivel solo los modifica el servidor."""

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name="perfil")
    apodo = models.CharField(max_length=juego.LARGO_MAXIMO_APODO)
    avatar = models.CharField(max_length=20, choices=Avatar.choices, default=Avatar.BYTE)
    experiencia = models.PositiveIntegerField(default=0)
    puntos = models.PositiveIntegerField(default=0)
    nivel = models.PositiveSmallIntegerField(default=juego.NIVEL_INICIAL)
    energia = models.PositiveSmallIntegerField(default=juego.ENERGIA_MAXIMA)

    class Meta:
        db_table = "perfil"
        verbose_name_plural = "perfiles"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(nivel__gte=juego.NIVEL_INICIAL), name="perfil_nivel_minimo"
            ),
            models.CheckConstraint(
                condition=models.Q(energia__lte=juego.ENERGIA_MAXIMA), name="perfil_energia_maxima"
            ),
        ]

    def __str__(self):
        return f"{self.apodo} ({self.usuario})"
