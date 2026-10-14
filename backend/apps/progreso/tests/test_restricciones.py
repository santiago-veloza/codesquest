"""Las reglas de integridad viven también en PostgreSQL, no solo en el código Python."""

import pytest
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from apps.contenido.models import Desafio, Dificultad, Mundo
from apps.gamificacion.models import CriterioLogro, Logro, UsuarioLogro
from apps.progreso.models import EstadoMundo, IntentoDesafio, ProgresoMundo, ResultadoIntento
from apps.usuarios.models import Perfil

pytestmark = pytest.mark.django_db


@pytest.fixture
def mundo():
    return Mundo.objects.create(
        codigo="mundo_1", orden=1, nombre="Ciudad", conceptos="Variables", descripcion="-"
    )


@pytest.fixture
def desafio(mundo):
    return Desafio.objects.create(
        mundo=mundo,
        codigo="1.1",
        orden=1,
        titulo="Caja",
        dificultad=Dificultad.BASICO,
        enunciado="-",
        codigo_base="x = ______",
        pruebas=[],
        pistas=[],
        xp_base=10,
        solucion_referencia="x = 1",
    )


def _intento(usuario, desafio, **campos):
    datos = {"codigo_enviado": "x = 1", "resultado": ResultadoIntento.CORRECTO, "tiempo_ms": 120} | campos
    return IntentoDesafio.objects.create(usuario=usuario, desafio=desafio, **datos)


def _logro(**campos):
    datos = {
        "codigo": "primer",
        "nombre": "P",
        "descripcion": "-",
        "icono": "i.svg",
        "criterio": CriterioLogro.PRIMER_DESAFIO,
    } | campos
    return Logro.objects.create(**datos)


def _falla_en_bd(funcion):
    with pytest.raises(IntegrityError), transaction.atomic():
        funcion()


def test_progreso_es_unico_por_usuario_y_mundo(usuario, mundo):
    ProgresoMundo.objects.create(usuario=usuario, mundo=mundo, estado=EstadoMundo.DESBLOQUEADO)
    _falla_en_bd(lambda: ProgresoMundo.objects.create(usuario=usuario, mundo=mundo))


def test_porcentaje_no_supera_100(usuario, mundo):
    _falla_en_bd(lambda: ProgresoMundo.objects.create(usuario=usuario, mundo=mundo, porcentaje=101))


def test_intento_incorrecto_no_puede_otorgar_xp(usuario, desafio):
    _falla_en_bd(lambda: _intento(usuario, desafio, resultado=ResultadoIntento.INCORRECTO, xp_otorgada=10))


def test_intento_no_supera_las_pistas_permitidas(usuario, desafio):
    _falla_en_bd(lambda: _intento(usuario, desafio, pistas_usadas=4))


def test_logro_unico_por_usuario(usuario):
    logro = _logro()
    UsuarioLogro.objects.create(usuario=usuario, logro=logro)
    _falla_en_bd(lambda: UsuarioLogro.objects.create(usuario=usuario, logro=logro))


def test_logro_completar_mundo_exige_mundo():
    _falla_en_bd(lambda: _logro(codigo="x", criterio=CriterioLogro.COMPLETAR_MUNDO))


def test_logro_sin_criterio_de_mundo_no_acepta_mundo(mundo):
    _falla_en_bd(lambda: _logro(codigo="y", mundo=mundo))


def test_energia_no_supera_el_maximo(usuario):
    _falla_en_bd(lambda: Perfil.objects.create(usuario=usuario, apodo="Ada", energia=101))


def test_xp_no_puede_ser_negativa(usuario):
    _falla_en_bd(lambda: Perfil.objects.create(usuario=usuario, apodo="Ada", experiencia=-1))


def test_borrar_usuario_borra_sus_datos(usuario, desafio, mundo):
    _intento(usuario, desafio)
    ProgresoMundo.objects.create(usuario=usuario, mundo=mundo)

    usuario.delete()

    assert IntentoDesafio.objects.count() == 0 and ProgresoMundo.objects.count() == 0


def test_no_se_puede_borrar_un_desafio_con_intentos(usuario, desafio):
    _intento(usuario, desafio)

    with pytest.raises(ProtectedError):
        desafio.delete()
