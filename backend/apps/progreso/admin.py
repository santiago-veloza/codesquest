from django.contrib import admin

from .models import IntentoDesafio, ProgresoMundo


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
