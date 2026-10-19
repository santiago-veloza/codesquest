"""Progreso del estudiante: estado de los mundos, intentos y obstáculos del laberinto resueltos.

Reglas:
- El primer mundo siempre está desbloqueado; los demás se desbloquean al COMPLETAR el anterior.
- Un obstáculo del laberinto queda resuelto con un intento correcto de su desafío.
- Game over → reiniciar: los obstáculos vuelven a aparecer (cuentan solo los aciertos posteriores).
- Un mundo se completa al llegar a la salida con todos sus obstáculos resueltos; el servidor lo
  comprueba con sus propios datos, no con lo que diga el navegador.
- XP, nivel, puntos y logros los decide apps/gamificacion/servicios.py (nunca el navegador).
"""

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from apps.contenido.models import Desafio, Mundo
from apps.gamificacion import servicios as gamificacion
from apps.gamificacion.servicios import Recompensa
from config import juego

from .estructura import motivo_de_rechazo
from .models import EstadoMundo, IntentoDesafio, ProgresoMundo, ResultadoIntento

ORDEN_PRIMER_MUNDO = 1


@dataclass(frozen=True)
class EstadoDeMundo:
    estado: str
    porcentaje: int

    @property
    def accesible(self) -> bool:
        return self.estado != EstadoMundo.BLOQUEADO


class MundoIncompleto(Exception):
    """Se intentó completar un mundo con obstáculos sin resolver."""


def estados_de_mundos(usuario) -> dict[int, EstadoDeMundo]:
    """Devuelve {mundo_id: EstadoDeMundo} con una sola consulta de progreso."""
    progresos = {p.mundo_id: p for p in ProgresoMundo.objects.filter(usuario=usuario)}
    estados = {}
    for mundo in Mundo.objects.filter(activo=True).only("id", "orden"):
        progreso = progresos.get(mundo.id)
        if progreso:
            estados[mundo.id] = EstadoDeMundo(progreso.estado, progreso.porcentaje)
        elif mundo.orden == ORDEN_PRIMER_MUNDO:
            estados[mundo.id] = EstadoDeMundo(EstadoMundo.DESBLOQUEADO, 0)
        else:
            estados[mundo.id] = EstadoDeMundo(EstadoMundo.BLOQUEADO, 0)
    return estados


def estado_de_mundo(usuario, mundo: Mundo) -> EstadoDeMundo:
    return estados_de_mundos(usuario).get(mundo.id, EstadoDeMundo(EstadoMundo.BLOQUEADO, 0))


def desafios_resueltos(usuario, mundo: Mundo) -> set[int]:
    """IDs de los desafíos del mundo con al menos un intento correcto (desde el último reinicio)."""
    intentos = IntentoDesafio.objects.filter(
        usuario=usuario, desafio__mundo=mundo, resultado=ResultadoIntento.CORRECTO
    )
    reinicio = (
        ProgresoMundo.objects.filter(usuario=usuario, mundo=mundo)
        .values_list("reiniciado_en", flat=True)
        .first()
    )
    if reinicio:
        intentos = intentos.filter(fecha__gt=reinicio)
    return set(intentos.values_list("desafio_id", flat=True))


@dataclass(frozen=True)
class IntentoRegistrado:
    intento: IntentoDesafio
    desafio_resuelto: bool
    progreso: ProgresoMundo
    total_desafios: int
    recompensa: Recompensa


@transaction.atomic
def registrar_intento(usuario, desafio: Desafio, datos: dict) -> IntentoRegistrado:
    """Guarda el intento. Si el navegador dice "correcto", el servidor revalida lo que puede sin
    ejecutar código (hueco, sintaxis y reglas de estructura); si no cuadra, lo guarda como incorrecto.
    """
    resultado, tipo_error = datos["resultado"], datos.get("tipo_error", "")
    if resultado == ResultadoIntento.CORRECTO:
        motivo = motivo_de_rechazo(datos["codigo_enviado"], desafio.pruebas)
        if motivo:
            resultado, tipo_error = ResultadoIntento.INCORRECTO, motivo

    intento = IntentoDesafio.objects.create(
        usuario=usuario,
        desafio=desafio,
        codigo_enviado=datos["codigo_enviado"],
        resultado=resultado,
        tipo_error=tipo_error,
        pistas_usadas=datos.get("pistas_usadas", 0),
        tiempo_ms=datos["tiempo_ms"],
    )
    correcto = resultado == ResultadoIntento.CORRECTO
    xp = (
        gamificacion.xp_para_intento_correcto(usuario, desafio, intento.pistas_usadas, intento.id)
        if correcto
        else 0
    )
    if xp:
        intento.xp_otorgada = xp
        intento.save(update_fields=["xp_otorgada"])
    recompensa = gamificacion.al_resolver_desafio(usuario, xp)
    progreso, total = _actualizar_progreso(usuario, desafio.mundo)
    return IntentoRegistrado(intento, correcto, progreso, total, recompensa)


def _actualizar_progreso(usuario, mundo: Mundo) -> tuple[ProgresoMundo, int]:
    total = mundo.desafios.count()
    resueltos = len(desafios_resueltos(usuario, mundo))
    progreso, _ = ProgresoMundo.objects.select_for_update().get_or_create(
        usuario=usuario, mundo=mundo, defaults={"estado": EstadoMundo.DESBLOQUEADO}
    )
    progreso.desafios_completados = resueltos
    if progreso.estado != EstadoMundo.COMPLETADO:
        progreso.porcentaje = juego.PORCENTAJE_MAXIMO * resueltos // total if total else 0
    progreso.save(update_fields=["desafios_completados", "porcentaje", "actualizado"])
    return progreso, total


@transaction.atomic
def completar_mundo(usuario, mundo: Mundo) -> tuple[Mundo | None, Recompensa]:
    """Marca el mundo como completado, otorga sus logros y desbloquea el siguiente.
    Devuelve (siguiente mundo o None, recompensa).

    Es idempotente: completar dos veces no cambia nada.
    """
    total = mundo.desafios.count()
    if len(desafios_resueltos(usuario, mundo)) < total:
        raise MundoIncompleto()

    progreso, _ = ProgresoMundo.objects.select_for_update().get_or_create(usuario=usuario, mundo=mundo)
    ya_estaba_completado = progreso.estado == EstadoMundo.COMPLETADO
    progreso.estado = EstadoMundo.COMPLETADO
    progreso.desafios_completados = total
    progreso.porcentaje = juego.PORCENTAJE_MAXIMO
    progreso.save()

    siguiente = Mundo.objects.filter(activo=True, orden__gt=mundo.orden).order_by("orden").first()
    if siguiente:
        progreso_siguiente, _ = ProgresoMundo.objects.get_or_create(usuario=usuario, mundo=siguiente)
        if progreso_siguiente.estado == EstadoMundo.BLOQUEADO:
            progreso_siguiente.estado = EstadoMundo.DESBLOQUEADO
            progreso_siguiente.save(update_fields=["estado", "actualizado"])
    return siguiente, gamificacion.al_completar_mundo(usuario, mundo, ya_estaba_completado)


@transaction.atomic
def reiniciar_mundo(usuario, mundo: Mundo) -> tuple[ProgresoMundo, int]:
    """Game over: el laberinto vuelve a empezar con todos sus obstáculos. Un mundo ya completado
    sigue completado (no se vuelve a bloquear el siguiente). La XP ganada no se pierde, y resolver
    de nuevo un desafío no da XP otra vez (ver gamificacion.xp_para_intento_correcto)."""
    progreso, _ = ProgresoMundo.objects.select_for_update().get_or_create(
        usuario=usuario, mundo=mundo, defaults={"estado": EstadoMundo.DESBLOQUEADO}
    )
    progreso.reiniciado_en = timezone.now()
    progreso.desafios_completados = 0
    if progreso.estado != EstadoMundo.COMPLETADO:
        progreso.porcentaje = 0
    progreso.save(update_fields=["reiniciado_en", "desafios_completados", "porcentaje", "actualizado"])
    return progreso, mundo.desafios.count()
