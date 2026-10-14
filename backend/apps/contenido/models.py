"""Mundos y desafíos. Se cargan desde content/ con `manage.py cargar_contenido`; no se escriben a mano."""

from django.db import models


class Dificultad(models.TextChoices):
    BASICO = "basico", "Básico"
    INTERMEDIO = "intermedio", "Intermedio"
    AVANZADO = "avanzado", "Avanzado"
    JEFE = "jefe", "Jefe de mundo"


class Mundo(models.Model):
    codigo = models.SlugField(max_length=40, unique=True, help_text="Clave estable usada por el contenido.")
    orden = models.PositiveSmallIntegerField()
    nombre = models.CharField(max_length=80)
    conceptos = models.CharField(max_length=200)
    descripcion = models.TextField()
    activo = models.BooleanField(default=True)
    funciones_juego = models.JSONField(
        default=list, blank=True, help_text="Funciones de la API de juego que se desbloquean en este mundo."
    )
    mapa = models.JSONField(
        default=list,
        blank=True,
        help_text="Laberinto: filas de texto (w pared, c camino, a inicio, s salida, 1-9 obstáculo).",
    )

    class Meta:
        db_table = "mundo"
        ordering = ["orden"]
        constraints = [
            # Diferible: permite reordenar mundos dentro de una transacción (cargar_contenido).
            models.UniqueConstraint(
                fields=["orden"], name="mundo_orden_unico", deferrable=models.Deferrable.DEFERRED
            ),
            models.CheckConstraint(condition=models.Q(orden__gte=1), name="mundo_orden_positivo"),
        ]

    def __str__(self):
        return f"{self.orden}. {self.nombre}"


class Desafio(models.Model):
    mundo = models.ForeignKey(Mundo, on_delete=models.PROTECT, related_name="desafios")
    codigo = models.CharField(max_length=20, unique=True, help_text='Ej.: "1.1"')
    orden = models.PositiveSmallIntegerField()
    titulo = models.CharField(max_length=120)
    dificultad = models.CharField(max_length=12, choices=Dificultad.choices)
    enunciado = models.TextField()
    codigo_base = models.TextField()
    pruebas = models.JSONField(help_text="Pruebas del evaluador (ver content/esquemas).")
    pistas = models.JSONField(help_text="Lista de pistas, de menos a más reveladora.")
    variantes = models.JSONField(
        default=list, blank=True, help_text="Variantes: preparacion (Python), entradas y esperado."
    )
    xp_base = models.PositiveSmallIntegerField()
    # Nunca se serializa hacia el cliente (ver ADR de ejecución de código).
    solucion_referencia = models.TextField()

    class Meta:
        db_table = "desafio"
        ordering = ["mundo__orden", "orden"]
        constraints = [
            models.UniqueConstraint(
                fields=["mundo", "orden"],
                name="desafio_orden_unico_por_mundo",
                deferrable=models.Deferrable.DEFERRED,
            ),
            models.CheckConstraint(condition=models.Q(orden__gte=1), name="desafio_orden_positivo"),
            models.CheckConstraint(condition=models.Q(xp_base__gte=1), name="desafio_xp_base_positiva"),
        ]

    def __str__(self):
        return f"{self.codigo} {self.titulo}"

    @property
    def es_jefe(self) -> bool:
        return self.dificultad == Dificultad.JEFE
