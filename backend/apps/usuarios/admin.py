from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Perfil, Usuario


class PerfilEnLinea(admin.StackedInline):
    model = Perfil
    can_delete = False
    # XP, puntos y nivel los calcula el servidor: el admin solo los muestra.
    readonly_fields = ("experiencia", "puntos", "nivel")


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    """Admin adaptado: el usuario se identifica por correo (no hay username, nombre ni apellido)."""

    inlines = [PerfilEnLinea]
    ordering = ("email",)
    list_display = ("email", "rol", "is_active", "fecha_registro", "last_login")
    list_filter = ("rol", "is_active", "is_staff")
    search_fields = ("email", "perfil__apodo")
    readonly_fields = ("fecha_registro", "last_login")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Rol y estado", {"fields": ("rol", "is_active", "is_staff", "is_superuser")}),
        ("Permisos", {"fields": ("groups", "user_permissions"), "classes": ("collapse",)}),
        ("Fechas", {"fields": ("fecha_registro", "last_login")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "rol", "password1", "password2")}),)
