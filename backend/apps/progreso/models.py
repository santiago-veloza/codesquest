from django.conf import settings
from django.db import models

from apps.contenido.models import Desafio, Mundo
from config import juego


class ResultadoIntento(models.TextChoices):
    CORRECTO = "correcto", "Correcto"
    INCORRECTO = "incorrecto", "Incorrecto"  # El código corrió, pero no cumple las pruebas.
    ERROR = "error", "Error de ejecución"  # Excepción, error de sintaxis o tiempo agotado.


class EstadoMundo(models.TextChoices):
    BLOQUEADO = "bloqueado", "Bloqueado"
    DESBLOQUEADO = "desbloqueado", "Desbloqueado"
    COMPLETADO = "completado", "Completado"


class IntentoDesafio(models.Model):
    """Cada ejecución enviada por el estudiante. Histórico inmutable."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="intentos")
    desafio = models.ForeignKey(Desafio, on_delete=models.PROTECT, related_name="intentos")
    codigo_enviado = models.TextField()
    resultado = models.CharField(max_length=12, choices=ResultadoIntento.choices)
    tipo_error = models.CharField(max_length=40, blank=True, help_text="Ej.: NameError, tiempo_agotado.")
    pistas_usadas = models.PositiveSmallIntegerField(default=0)
    tiempo_ms = models.PositiveIntegerField()
    xp_otorgada = models.PositiveSmallIntegerField(default=0)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "intento_desafio"
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["usuario", "desafio"], name="intento_usuario_desafio_idx"),
            models.Index(fields=["fecha"], name="intento_fecha_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(pistas_usadas__lte=juego.PISTAS_POR_DESAFIO), name="intento_pistas_maximas"
            ),
            # Solo un intento correcto puede otorgar XP.
            models.CheckConstraint(
                condition=models.Q(resultado=ResultadoIntento.CORRECTO) | models.Q(xp_otorgada=0),
                name="intento_xp_solo_si_correcto",
            ),
        ]

    def __str__(self):
        return f"{self.usuario} → {self.desafio.codigo} ({self.resultado})"


class ProgresoMundo(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="progresos")
    mundo = models.ForeignKey(Mundo, on_delete=models.PROTECT, related_name="progresos")
    desafios_completados = models.PositiveSmallIntegerField(default=0)
    porcentaje = models.PositiveSmallIntegerField(default=0)
    estado = models.CharField(max_length=12, choices=EstadoMundo.choices, default=EstadoMundo.BLOQUEADO)
    actualizado = models.DateTimeField(auto_now=True)
    # "Game over → Reiniciar": los obstáculos vuelven a aparecer. Los intentos no se borran (historial
    # para el docente); solo cuentan como resueltos los intentos correctos posteriores a esta fecha.
    reiniciado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "progreso_mundo"
        ordering = ["mundo__orden"]
        constraints = [
            models.UniqueConstraint(fields=["usuario", "mundo"], name="progreso_usuario_mundo_unico"),
            models.CheckConstraint(
                condition=models.Q(porcentaje__lte=juego.PORCENTAJE_MAXIMO), name="progreso_porcentaje_rango"
            ),
        ]

    def __str__(self):
        return f"{self.usuario} · {self.mundo} · {self.porcentaje}%"
