import csv

from django.contrib import admin
from django.http import HttpResponse
from django.template.response import TemplateResponse
from django.utils import timezone

from config import juego

from . import estadisticas
from .models import IntentoDesafio, ProgresoMundo

# Portada del admin con el acceso a las estadísticas (RF-11).
admin.site.site_header = "CODEQUEST · Administración"
admin.site.site_title = "CODEQUEST"
admin.site.index_template = "admin/codequest_index.html"

TITULO_ESTADISTICAS = "Estadísticas del curso"
NOMBRE_CSV = "codequest_estudiantes_{fecha}.csv"
# Excel en español usa ";" como separador.
SEPARADOR_CSV = ";"
MARCA_BOM = "\ufeff"
# OWASP (inyección en CSV): un valor que empieza así Excel lo ejecutaría como fórmula.
INICIO_DE_FORMULA = ("=", "+", "-", "@", "\t", "\r")


@admin.register(IntentoDesafio)
class IntentoDesafioAdmin(admin.ModelAdmin):
    """Histórico: solo lectura (los intentos no se editan a mano)."""

    list_display = ("fecha", "usuario", "desafio", "resultado", "tipo_error", "pistas_usadas", "xp_otorgada")
    list_filter = ("resultado", "desafio__mundo", "tipo_error")
    search_fields = ("usuario__email", "desafio__codigo")
    date_hierarchy = "fecha"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ProgresoMundo)
class ProgresoMundoAdmin(admin.ModelAdmin):
    list_display = ("usuario", "mundo", "estado", "desafios_completados", "porcentaje", "actualizado")
    list_filter = ("estado", "mundo")
    search_fields = ("usuario__email",)


def vista_estadisticas(request):
    """Panel del docente: resumen, avance por mundo, dificultad de cada desafío y cada estudiante."""
    contexto = {
        **admin.site.each_context(request),
        "title": TITULO_ESTADISTICAS,
        "resumen": estadisticas.resumen(),
        "mundos": estadisticas.por_mundo(),
        "desafios": estadisticas.por_desafio(),
        "estudiantes": estadisticas.por_estudiante(),
        "umbral_dificil": juego.UMBRAL_DESAFIO_DIFICIL,
    }
    return TemplateResponse(request, "admin/progreso/estadisticas.html", contexto)


def _celda_segura(valor) -> str:
    texto = "" if valor is None else str(valor)
    return "'" + texto if texto.startswith(INICIO_DE_FORMULA) else texto


def exportar_estudiantes_csv(request):
    """Los datos de la tabla de estudiantes en CSV para abrir en Excel (datos personales: Ley 1581)."""
    respuesta = HttpResponse(content_type="text/csv; charset=utf-8")
    nombre = NOMBRE_CSV.format(fecha=timezone.localdate().isoformat())
    respuesta["Content-Disposition"] = f'attachment; filename="{nombre}"'
    respuesta.write(MARCA_BOM)  # Excel necesita el BOM para leer bien las tildes
    escritor = csv.writer(respuesta, delimiter=SEPARADOR_CSV)
    escritor.writerow(
        [
            "Apodo",
            "Correo",
            "Nivel",
            "XP",
            "Puntos",
            "Mundos completados",
            "Desafíos resueltos",
            "Intentos",
            "Última actividad",
        ]
    )
    for e in estadisticas.por_estudiante():
        actividad = (
            timezone.localtime(e.ultima_actividad).strftime("%Y-%m-%d %H:%M") if e.ultima_actividad else ""
        )
        escritor.writerow(
            [
                _celda_segura(v)
                for v in (
                    e.apodo,
                    e.email,
                    e.nivel,
                    e.experiencia,
                    e.puntos,
                    e.mundos_completados,
                    e.desafios_resueltos,
                    e.intentos,
                    actividad,
                )
            ]
        )
    return respuesta
