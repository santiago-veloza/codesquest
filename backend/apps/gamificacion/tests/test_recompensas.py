"""XP, puntos, nivel y logros al jugar (siempre decididos por el servidor)."""

import pytest
from django.core.management import call_command
from django.urls import reverse

from apps.contenido.models import Desafio, Mundo
from apps.gamificacion.models import UsuarioLogro
from apps.gamificacion.servicios import nivel_para
from apps.usuarios.models import Perfil
from config import juego

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_estudiante(api, usuario, contenido_tmp):
    call_command("cargar_contenido", directorio=contenido_tmp)
    api.force_authenticate(usuario)
    return api


def _intento(api, desafio, resultado="correcto", **extra):
    datos = {"codigo_enviado": desafio.solucion_referencia, "resultado": resultado, "tiempo_ms": 5000, **extra}
    return api.post(reverse("intentos", args=[desafio.pk]), datos, format="json").json()


def _mundo(orden):
    return Mundo.objects.get(orden=orden)


def _resolver_mundo(api, orden, **extra):
    return [_intento(api, d, **extra) for d in _mundo(orden).desafios.all()]


def _completar(api, orden):
    return api.post(reverse("completar-mundo", args=[_mundo(orden).pk])).json()


def _logros(usuario):
    return set(UsuarioLogro.objects.filter(usuario=usuario).values_list("logro__codigo", flat=True))


def test_primer_acierto_da_xp_base_mas_bonus_y_el_primer_logro(api_estudiante, usuario):
    desafio = Desafio.objects.get(codigo="1.1")

    recompensa = _intento(api_estudiante, desafio)["recompensa"]

    xp = desafio.xp_base + juego.BONUS_PRIMER_INTENTO
    assert recompensa["xp_otorgada"] == xp
    assert recompensa["experiencia"] == xp and recompensa["puntos"] == xp
    assert [l["codigo"] for l in recompensa["logros_nuevos"]] == ["primer_codigo"]
    assert recompensa["experiencia_nivel_actual"] <= xp < recompensa["experiencia_siguiente_nivel"]
    perfil = Perfil.objects.get(usuario=usuario)
    assert (perfil.experiencia, perfil.puntos) == (xp, xp)


def test_acertar_despues_de_fallar_no_da_bonus(api_estudiante):
    desafio = Desafio.objects.get(codigo="1.1")
    _intento(api_estudiante, desafio, resultado="incorrecto")

    assert _intento(api_estudiante, desafio)["recompensa"]["xp_otorgada"] == desafio.xp_base


def test_las_pistas_restan_xp(api_estudiante):
    desafio = Desafio.objects.get(codigo="1.1")

    recompensa = _intento(api_estudiante, desafio, pistas_usadas=2)["recompensa"]

    assert recompensa["xp_otorgada"] == max(
        desafio.xp_base - 2 * juego.PENALIZACION_POR_PISTA, int(desafio.xp_base * juego.FRACCION_MINIMA_XP)
    ) + juego.BONUS_PRIMER_INTENTO


def test_resolver_otra_vez_no_da_mas_xp_ni_logros(api_estudiante, usuario):
    desafio = Desafio.objects.get(codigo="1.1")
    primera = _intento(api_estudiante, desafio)["recompensa"]

    segunda = _intento(api_estudiante, desafio)["recompensa"]

    assert segunda["xp_otorgada"] == 0
    assert segunda["experiencia"] == primera["experiencia"]
    assert segunda["logros_nuevos"] == []


def test_un_intento_incorrecto_no_da_nada(api_estudiante, usuario):
    recompensa = _intento(api_estudiante, Desafio.objects.get(codigo="1.1"), resultado="incorrecto")["recompensa"]

    assert (recompensa["xp_otorgada"], recompensa["experiencia"], recompensa["logros_nuevos"]) == (0, 0, [])
    assert _logros(usuario) == set()


def test_el_nivel_sube_al_cruzar_el_umbral(api_estudiante, usuario):
    respuestas = _resolver_mundo(api_estudiante, 1)

    experiencia = respuestas[-1]["recompensa"]["experiencia"]
    assert respuestas[-1]["recompensa"]["nivel"] == nivel_para(experiencia)
    assert any(r["recompensa"]["subio_de_nivel"] for r in respuestas) == (nivel_para(experiencia) > juego.NIVEL_INICIAL)


def test_completar_sin_pistas_da_logro_del_mundo_sin_pistas_y_bonus(api_estudiante, usuario):
    puntos_antes = _resolver_mundo(api_estudiante, 1)[-1]["recompensa"]["puntos"]

    recompensa = _completar(api_estudiante, 1)["recompensa"]

    assert {l["codigo"] for l in recompensa["logros_nuevos"]} == {"maestro_variables", "sin_pistas"}
    assert recompensa["puntos"] == puntos_antes + juego.BONUS_PUNTOS_MUNDO
    assert (recompensa["xp_otorgada"], recompensa["puntos_otorgados"]) == (0, juego.BONUS_PUNTOS_MUNDO)


def test_completar_usando_pistas_no_da_el_logro_sin_pistas(api_estudiante, usuario):
    _resolver_mundo(api_estudiante, 1, pistas_usadas=1)

    recompensa = _completar(api_estudiante, 1)["recompensa"]

    assert [l["codigo"] for l in recompensa["logros_nuevos"]] == ["maestro_variables"]


def test_completar_dos_veces_no_suma_el_bonus_otra_vez(api_estudiante, usuario):
    _resolver_mundo(api_estudiante, 1)
    primera = _completar(api_estudiante, 1)["recompensa"]

    segunda = _completar(api_estudiante, 1)["recompensa"]

    assert segunda["puntos"] == primera["puntos"]
    assert segunda["puntos_otorgados"] == 0
    assert Perfil.objects.get(usuario=usuario).puntos == primera["puntos"]


def test_el_catalogo_marca_los_logros_obtenidos(api_estudiante):
    _intento(api_estudiante, Desafio.objects.get(codigo="1.1"))

    catalogo = api_estudiante.get(reverse("logros")).json()

    assert [l["codigo"] for l in catalogo][0] == "primer_codigo"
    obtenidos = {l["codigo"]: l for l in catalogo if l["obtenido"]}
    assert set(obtenidos) == {"primer_codigo"}
    assert obtenidos["primer_codigo"]["fecha_obtencion"]
    assert all(l["fecha_obtencion"] is None for l in catalogo if not l["obtenido"])
    assert all(l["icono"].startswith("img/logros/") for l in catalogo)


def test_el_catalogo_exige_sesion(api):
    assert api.get(reverse("logros")).status_code == 401


def test_el_perfil_trae_los_umbrales_de_la_barra(api_estudiante):
    _intento(api_estudiante, Desafio.objects.get(codigo="1.1"))

    perfil = api_estudiante.get(reverse("perfil")).json()

    assert perfil["experiencia_nivel_actual"] <= perfil["experiencia"] < perfil["experiencia_siguiente_nivel"]
