from django.contrib import admin

from .models import Desafio, Mundo


class DesafioEnLinea(admin.TabularInline):
    model = Desafio
    fields = ("codigo", "orden", "titulo", "dificultad", "xp_base")
    show_change_link = True
    extra = 0


@admin.register(Mundo)
class MundoAdmin(admin.ModelAdmin):
    list_display = ("orden", "nombre", "codigo", "activo")
    list_display_links = ("nombre",)
    inlines = [DesafioEnLinea]


@admin.register(Desafio)
class DesafioAdmin(admin.ModelAdmin):
    list_display = ("codigo", "titulo", "mundo", "dificultad", "xp_base")
    list_filter = ("mundo", "dificultad")
    search_fields = ("codigo", "titulo", "enunciado")
    ordering = ("mundo__orden", "orden")
