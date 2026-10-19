from django.conf import settings
from django.db import models

from apps.contenido.models import Mundo


class CriterioLogro(models.TextChoices):
    PRIMER_DESAFIO = "primer_desafio", "Resolver el primer desafío"
    COMPLETAR_MUNDO = "completar_mundo", "Completar un mundo"
    MUNDO_SIN_PISTAS = "mundo_sin_pistas", "Completar un mundo sin usar pistas"


class Logro(models.Model):
    """Catálogo de logros. Se otorgan solo en el servidor."""

    codigo = models.SlugField(max_length=40, unique=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=200)
    icono = models.CharField(
        max_length=120, help_text="Ruta pública del icono en el frontend (img/logros/...)."
    )
    criterio = models.CharField(max_length=20, choices=CriterioLogro.choices)
    # Solo para COMPLETAR_MUNDO: qué mundo hay que completar.
    mundo = models.ForeignKey(Mundo, on_delete=models.PROTECT, null=True, blank=True, related_name="logros")
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "logro"
        ordering = ["orden"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(criterio=CriterioLogro.COMPLETAR_MUNDO, mundo__isnull=False)
                    | (~models.Q(criterio=CriterioLogro.COMPLETAR_MUNDO) & models.Q(mundo__isnull=True))
                ),
                name="logro_mundo_solo_si_completar_mundo",
            ),
        ]

    def __str__(self):
        return self.nombre


class UsuarioLogro(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="logros")
    logro = models.ForeignKey(Logro, on_delete=models.PROTECT, related_name="obtenidos")
    fecha_obtencion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "usuario_logro"
        ordering = ["-fecha_obtencion"]
        constraints = [
            models.UniqueConstraint(fields=["usuario", "logro"], name="usuario_logro_unico"),
        ]

    def __str__(self):
        return f"{self.usuario} · {self.logro}"
