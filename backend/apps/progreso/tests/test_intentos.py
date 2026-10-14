"""Intentos, obstáculos resueltos y paso al siguiente mundo (el servidor decide, no el navegador)."""

import pytest
from django.core.management import call_command
from django.urls import reverse

from apps.contenido.models import Desafio, Mundo
from apps.progreso.models import EstadoMundo, IntentoDesafio, ProgresoMundo, ResultadoIntento
from config import juego

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_estudiante(api, usuario, contenido_tmp):
    call_command("cargar_contenido", directorio=contenido_tmp)
    api.force_authenticate(usuario)
    return api


def _intento(api, desafio, codigo=None, resultado="correcto", **extra):
    datos = {
        "codigo_enviado": codigo if codigo is not None else desafio.solucion_referencia,
        "resultado": resultado,
        "tiempo_ms": 5000,
        **extra,
    }
    return api.post(reverse("intentos", args=[desafio.pk]), datos, format="json")


def _mundo(orden):
    return Mundo.objects.get(orden=orden)


def test_el_laberinto_trae_mapa_y_obstaculos_pendientes(api_estudiante):
    datos = api_estudiante.get(reverse("mundo", args=[_mundo(1).pk])).json()

    assert datos["mapa"][0].startswith("www")
    assert [o["simbolo"] for o in datos["obstaculos"]] == ["1", "2", "3"]
    assert not any(o["resuelto"] for o in datos["obstaculos"])
    assert "solucion_referencia" not in str(datos)


def test_intento_correcto_resuelve_el_obstaculo_y_actualiza_el_progreso(api_estudiante, usuario):
    desafio = Desafio.objects.get(codigo="1.1")

    respuesta = _intento(api_estudiante, desafio)

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["desafio_resuelto"] is True
    assert cuerpo["progreso"] == {
        "estado": "desbloqueado",
        "porcentaje": 33,
        "desafios_completados": 1,
        "total_desafios": 3,
    }
    obstaculos = api_estudiante.get(reverse("mundo", args=[_mundo(1).pk])).json()["obstaculos"]
    assert [o["resuelto"] for o in obstaculos] == [True, False, False]


def test_intento_incorrecto_se_guarda_pero_no_resuelve(api_estudiante, usuario):
    desafio = Desafio.objects.get(codigo="1.1")

    cuerpo = _intento(api_estudiante, desafio, "energia = 10", "incorrecto").json()

    assert cuerpo["desafio_resuelto"] is False
    assert IntentoDesafio.objects.get(usuario=usuario).resultado == ResultadoIntento.INCORRECTO


@pytest.mark.parametrize(
    ("codigo_desafio", "codigo", "motivo"),
    [
        ("1.1", "energia = ______", "hueco_sin_completar"),
        ("1.1", "energia = (", "sintaxis_invalida"),
        ("1.3", "dano = 41", "estructura_invalida"),
    ],
)
def test_un_correcto_que_no_cuadra_se_guarda_como_incorrecto(
    api_estudiante, usuario, codigo_desafio, codigo, motivo
):
    desafio = Desafio.objects.get(codigo=codigo_desafio)

    cuerpo = _intento(api_estudiante, desafio, codigo, "correcto").json()

    assert cuerpo["desafio_resuelto"] is False
    intento = IntentoDesafio.objects.get(usuario=usuario)
    assert (intento.resultado, intento.tipo_error) == (ResultadoIntento.INCORRECTO, motivo)


def test_el_cliente_no_puede_asignarse_xp(api_estudiante, usuario):
    desafio = Desafio.objects.get(codigo="1.1")

    _intento(api_estudiante, desafio, xp_otorgada=999)

    # El campo enviado se ignora: la XP la calcula el servidor (xp_base + bonus de primer intento).
    assert IntentoDesafio.objects.get(usuario=usuario).xp_otorgada == desafio.xp_base + juego.BONUS_PRIMER_INTENTO


@pytest.mark.parametrize(
    "cambio",
    [{"pistas_usadas": 4}, {"tiempo_ms": -1}, {"resultado": "trampa"}, {"codigo_enviado": "x" * 10_001}],
    ids=["pistas", "tiempo", "resultado", "codigo_largo"],
)
def test_datos_fuera_de_rango_se_rechazan(api_estudiante, cambio):
    desafio = Desafio.objects.get(codigo="1.1")

    assert _intento(api_estudiante, desafio, **cambio).status_code == 400


def test_no_se_puede_intentar_un_desafio_de_un_mundo_bloqueado(api_estudiante):
    assert _intento(api_estudiante, Desafio.objects.get(codigo="2.1")).status_code == 403


def test_no_se_completa_el_mundo_con_obstaculos_pendientes(api_estudiante):
    _intento(api_estudiante, Desafio.objects.get(codigo="1.1"))

    respuesta = api_estudiante.post(reverse("completar-mundo", args=[_mundo(1).pk]))

    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["codigo"] == "mundo_incompleto"


def test_completar_el_mundo_desbloquea_el_siguiente(api_estudiante, usuario):
    for desafio in _mundo(1).desafios.all():
        _intento(api_estudiante, desafio)

    respuesta = api_estudiante.post(reverse("completar-mundo", args=[_mundo(1).pk]))

    assert respuesta.status_code == 200
    assert respuesta.json()["siguiente_mundo"]["id"] == _mundo(2).pk
    assert ProgresoMundo.objects.get(usuario=usuario, mundo=_mundo(1)).estado == EstadoMundo.COMPLETADO
    estados = {m["orden"]: m["estado"] for m in api_estudiante.get(reverse("mundos")).json()}
    assert estados[1] == "completado" and estados[2] == "desbloqueado" and estados[3] == "bloqueado"
    # Ahora sí puede entrar al laberinto del mundo 2.
    assert api_estudiante.get(reverse("mundo", args=[_mundo(2).pk])).status_code == 200


def test_completar_dos_veces_no_cambia_nada(api_estudiante):
    for desafio in _mundo(1).desafios.all():
        _intento(api_estudiante, desafio)
    url = reverse("completar-mundo", args=[_mundo(1).pk])

    primera, segunda = api_estudiante.post(url).json(), api_estudiante.post(url).json()

    assert primera["siguiente_mundo"] == segunda["siguiente_mundo"]
    # La segunda vez no da puntos ni logros nuevos.
    assert segunda["recompensa"]["puntos"] == primera["recompensa"]["puntos"]
    assert segunda["recompensa"]["logros_nuevos"] == []


def test_los_golden_de_contenido_pasan_la_revalidacion_del_servidor(api_estudiante):
    """Las soluciones de referencia deben ser aceptadas por la revalidación AST del servidor."""
    for desafio in Desafio.objects.filter(mundo__orden=1):
        assert _intento(api_estudiante, desafio).json()["desafio_resuelto"] is True


def test_reiniciar_tras_game_over_vuelve_a_poner_los_obstaculos(api_estudiante, usuario):
    _intento(api_estudiante, Desafio.objects.get(codigo="1.1"))

    respuesta = api_estudiante.post(reverse("reiniciar-mundo", args=[_mundo(1).pk]))

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "desbloqueado", "porcentaje": 0, "desafios_completados": 0, "total_desafios": 3}
    obstaculos = api_estudiante.get(reverse("mundo", args=[_mundo(1).pk])).json()["obstaculos"]
    assert not any(o["resuelto"] for o in obstaculos)
    # El historial se conserva para el docente.
    assert IntentoDesafio.objects.filter(usuario=usuario).count() == 1


def test_tras_reiniciar_resolver_otra_vez_cuenta_pero_no_da_xp(api_estudiante):
    desafio = Desafio.objects.get(codigo="1.1")
    _intento(api_estudiante, desafio)
    api_estudiante.post(reverse("reiniciar-mundo", args=[_mundo(1).pk]))

    cuerpo = _intento(api_estudiante, desafio).json()

    assert cuerpo["desafio_resuelto"] is True
    assert cuerpo["progreso"]["desafios_completados"] == 1
    assert cuerpo["recompensa"]["xp_otorgada"] == 0


def test_reiniciar_un_mundo_completado_no_lo_vuelve_a_bloquear(api_estudiante, usuario):
    for desafio in _mundo(1).desafios.all():
        _intento(api_estudiante, desafio)
    api_estudiante.post(reverse("completar-mundo", args=[_mundo(1).pk]))

    datos = api_estudiante.post(reverse("reiniciar-mundo", args=[_mundo(1).pk])).json()

    assert datos["estado"] == "completado"
    estados = {m["orden"]: m["estado"] for m in api_estudiante.get(reverse("mundos")).json()}
    assert estados[2] == "desbloqueado"


def test_no_se_puede_reiniciar_un_mundo_bloqueado(api_estudiante):
    assert api_estudiante.post(reverse("reiniciar-mundo", args=[_mundo(2).pk])).status_code == 403
