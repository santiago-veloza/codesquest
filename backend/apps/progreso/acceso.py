"""Regla de acceso compartida por las vistas de contenido y de progreso: solo se entra a mundos
desbloqueados. Vive aquí (y no en una vista) para que ninguna vista dependa de la vista de otra app."""

from rest_framework.exceptions import PermissionDenied

from apps.contenido.models import Mundo

from .servicios import estado_de_mundo

MENSAJE_MUNDO_BLOQUEADO = "Este mundo aún está bloqueado. Completa el mundo anterior para entrar."


def exigir_mundo_accesible(usuario, mundo: Mundo) -> None:
    if not estado_de_mundo(usuario, mundo).accesible:
        raise PermissionDenied(MENSAJE_MUNDO_BLOQUEADO)
