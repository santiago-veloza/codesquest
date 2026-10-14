import json

import pytest
from django.core.management import call_command
from django.urls import reverse

from apps.contenido.models import Desafio, Mundo
from apps.progreso.models import EstadoMundo, ProgresoMundo

pytestmark = pytest.mark.django_db


@pytest.fixture
def contenido(contenido_tmp):
    call_command("cargar_contenido", directorio=contenido_tmp)


@pytest.fixture
def api_estudiante(api, usuario, contenido):
    api.force_authenticate(usuario)
    return api


def test_contenido_exige_sesion(api, contenido):
    assert api.get(reverse("mundos")).status_code == 401


def test_mundos_en_orden_con_el_primero_desbloqueado(api_estudiante):
    mundos = api_estudiante.get(reverse("mundos")).json()

    assert [m["orden"] for m in mundos] == [1, 2, 3, 4, 5]
    assert mundos[0]["estado"] == EstadoMundo.DESBLOQUEADO
    assert {m["estado"] for m in mundos[1:]} == {EstadoMundo.BLOQUEADO}


def test_el_estado_refleja_el_progreso_guardado(api_estudiante, usuario):
    mundo_2 = Mundo.objects.get(orden=2)
    ProgresoMundo.objects.create(
        usuario=usuario, mundo=mundo_2, estado=EstadoMundo.DESBLOQUEADO, porcentaje=40
    )

    mundos = api_estudiante.get(reverse("mundos")).json()

    assert mundos[1]["estado"] == EstadoMundo.DESBLOQUEADO and mundos[1]["porcentaje"] == 40


def test_desafios_de_un_mundo_desbloqueado(api_estudiante):
    mundo_1 = Mundo.objects.get(orden=1)

    desafios = api_estudiante.get(reverse("desafios-de-mundo", args=[mundo_1.pk])).json()

    assert desafios[0]["codigo"] == "1.1"
    assert set(desafios[0]) == {"id", "codigo", "orden", "titulo", "dificultad", "xp_base"}


def test_mundo_bloqueado_no_muestra_sus_desafios(api_estudiante):
    respuesta = api_estudiante.get(reverse("desafios-de-mundo", args=[Mundo.objects.get(orden=2).pk]))

    assert respuesta.status_code == 403
    assert "bloqueado" in respuesta.json()["error"]["mensaje"]


def test_detalle_trae_lo_necesario_para_evaluar(api_estudiante):
    desafio = Desafio.objects.get(codigo="1.1")

    datos = api_estudiante.get(reverse("desafio", args=[desafio.pk])).json()

    assert datos["codigo_base"] == "energia = ______"
    assert len(datos["pistas"]) == 3 and datos["pruebas"]
    assert datos["mundo"]["orden"] == 1 and datos["funciones_juego"] == []


def test_la_solucion_de_referencia_nunca_viaja_al_cliente(api_estudiante):
    desafio = Desafio.objects.get(codigo="1.1")

    respuesta = api_estudiante.get(reverse("desafio", args=[desafio.pk]))

    cuerpo = respuesta.content.decode()
    assert "solucion_referencia" not in cuerpo and "errores_tipicos" not in cuerpo
    assert desafio.solucion_referencia not in json.loads(cuerpo).values()


def test_desafio_de_mundo_bloqueado_responde_403(api_estudiante):
    desafio = Desafio.objects.get(codigo="2.1")

    assert api_estudiante.get(reverse("desafio", args=[desafio.pk])).status_code == 403


def test_desafio_inexistente_responde_404(api_estudiante):
    assert api_estudiante.get(reverse("desafio", args=[99999])).status_code == 404


def test_mundo_inactivo_no_aparece(api_estudiante):
    Mundo.objects.filter(orden=5).update(activo=False)

    assert len(api_estudiante.get(reverse("mundos")).json()) == 4
