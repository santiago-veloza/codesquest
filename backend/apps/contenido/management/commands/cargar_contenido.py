from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.contenido.carga import ErrorContenido, cargar_contenido


class Command(BaseCommand):
    help = "Valida y carga mundos, desafíos y logros desde content/. Es idempotente."

    def add_arguments(self, parser):
        parser.add_argument("--directorio", type=Path, default=settings.CONTENIDO_DIR)
        parser.add_argument(
            "--solo-validar", action="store_true", help="Valida sin escribir en la base de datos."
        )

    def handle(self, *args, directorio: Path, solo_validar: bool, **opciones):
        try:
            resumen = cargar_contenido(directorio, solo_validar=solo_validar)
        except ErrorContenido as e:
            raise CommandError(str(e)) from e

        if solo_validar:
            self.stdout.write(self.style.SUCCESS("Contenido válido. No se escribió nada."))
            return
        for nombre, conteo in (
            ("Mundos", resumen.mundos),
            ("Desafíos", resumen.desafios),
            ("Logros", resumen.logros),
        ):
            detalle = (
                ", ".join(f"{n} {accion.replace('_', ' ')}" for accion, n in sorted(conteo.items()))
                or "ninguno"
            )
            self.stdout.write(f"{nombre}: {detalle}")
        self.stdout.write(self.style.SUCCESS("Contenido cargado."))
