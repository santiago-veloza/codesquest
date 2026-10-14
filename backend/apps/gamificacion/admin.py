from django.contrib import admin

from .models import Logro, UsuarioLogro


@admin.register(Logro)
class LogroAdmin(admin.ModelAdmin):
    list_display = ("orden", "nombre", "criterio", "mundo")
    list_display_links = ("nombre",)


@admin.register(UsuarioLogro)
class UsuarioLogroAdmin(admin.ModelAdmin):
    list_display = ("usuario", "logro", "fecha_obtencion")
    list_filter = ("logro",)
    search_fields = ("usuario__email",)
