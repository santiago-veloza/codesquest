import json

import pytest
from django.conf import settings
from django.core.management import CommandError, call_command

from apps.contenido.carga import ErrorContenido, cargar_contenido, leer_y_validar
from apps.contenido.models import Desafio, Mundo
from apps.gamificacion.models import Logro


def _leer(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))


def _escribir(ruta, datos):
    ruta.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")


def _mundo_1(contenido):
    return contenido / "mundos" / "mundo_1.json"


def test_el_contenido_real_del_repositorio_es_valido():
    mundos, logros = leer_y_validar(settings.CONTENIDO_DIR)

    assert [m["orden"] for m in mundos] == [1, 2, 3, 4, 5]
    assert len(logros) == 7


@pytest.mark.django_db
def test_carga_crea_todo_y_es_idempotente(contenido_tmp):
    primera = cargar_contenido(contenido_tmp)
    segunda = cargar_contenido(contenido_tmp)

    assert primera.mundos["creados"] == 5
    assert Mundo.objects.count() == 5 and Logro.objects.count() == 7
    assert segunda.mundos["sin_cambios"] == 5
    assert segunda.desafios["sin_cambios"] == Desafio.objects.count()
    assert not segunda.mundos["creados"] and not segunda.mundos["actualizados"]


@pytest.mark.django_db
def test_cambiar_un_titulo_actualiza_solo_ese_desafio(contenido_tmp):
    cargar_contenido(contenido_tmp)
    datos = _leer(_mundo_1(contenido_tmp))
    datos["desafios"][0]["titulo"] = "La primerísima caja"
    _escribir(_mundo_1(contenido_tmp), datos)

    resumen = cargar_contenido(contenido_tmp)

    assert resumen.desafios["actualizados"] == 1
    assert Desafio.objects.get(codigo="1.1").titulo == "La primerísima caja"


@pytest.mark.django_db
def test_logro_de_mundo_queda_enlazado_a_su_mundo(contenido_tmp):
    cargar_contenido(contenido_tmp)

    assert Logro.objects.get(codigo="cazador_bugs").mundo.codigo == "mundo_5"
    assert Logro.objects.get(codigo="sin_pistas").mundo is None


@pytest.mark.django_db
def test_intercambiar_el_orden_de_dos_desafios_funciona(contenido_tmp):
    cargar_contenido(contenido_tmp)
    datos = _leer(_mundo_1(contenido_tmp))
    datos["desafios"][0]["orden"], datos["desafios"][1]["orden"] = 2, 1
    _escribir(_mundo_1(contenido_tmp), datos)

    cargar_contenido(contenido_tmp)  # La restricción diferida evita el choque temporal de órdenes.

    assert Desafio.objects.get(codigo="1.1").orden == 2
    assert Desafio.objects.get(codigo="1.2").orden == 1


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("modificar", "fragmento_error"),
    [
        (lambda d: d["desafios"][0].update(dificultad="facil"), "dificultad"),
        (lambda d: d["desafios"][0].update(pistas=["solo una", "y otra"]), "pistas"),
        (lambda d: d["desafios"][0].pop("solucion_referencia"), "solucion_referencia"),
        (lambda d: d["desafios"][0].update(errores_tipicos=[]), "errores_tipicos"),
        (lambda d: d["desafios"][0].update(codigo="2.1"), "debe empezar por '1.'"),
        (lambda d: d["desafios"][0].update(pruebas=[{"tipo": "salida"}]), "esperado"),
        (lambda d: d["desafios"][0].update(campo_inventado=1), "campo_inventado"),
        (lambda d: d["desafios"][0].update(variantes=[{"preparacion": "x = (1"}]), "no es Python válido"),
        (lambda d: d["desafios"][0].update(variantes=[{"preparacion": "import os"}]), "asignaciones simples"),
        (lambda d: d["desafios"][0].update(variantes=[{"preparacion": "x = len('a')"}]), "valores literales"),
    ],
    ids=[
        "dificultad",
        "pistas",
        "sin_solucion",
        "sin_errores_tipicos",
        "prefijo",
        "prueba",
        "campo_extra",
        "preparacion_sintaxis",
        "preparacion_no_asignacion",
        "preparacion_no_literal",
    ],
)
def test_contenido_invalido_no_carga_nada(contenido_tmp, modificar, fragmento_error):
    datos = _leer(_mundo_1(contenido_tmp))
    modificar(datos)
    _escribir(_mundo_1(contenido_tmp), datos)

    with pytest.raises(ErrorContenido) as error:
        cargar_contenido(contenido_tmp)

    assert fragmento_error in str(error.value)
    assert Mundo.objects.count() == 0 and Logro.objects.count() == 0


@pytest.mark.django_db
def test_variante_con_preparacion_literal_se_acepta(contenido_tmp):
    datos = _leer(_mundo_1(contenido_tmp))
    datos["desafios"][0]["variantes"] = [
        {"preparacion": "precio = 3.0\ncantidad = 2\nllave = True", "esperado": {"total": "6.0"}}
    ]
    _escribir(_mundo_1(contenido_tmp), datos)

    cargar_contenido(contenido_tmp)

    assert Desafio.objects.get(codigo="1.1").variantes[0]["preparacion"].startswith("precio = 3.0")


@pytest.mark.django_db
def test_codigo_de_mundo_repetido_entre_archivos_se_detecta(contenido_tmp):
    datos = _leer(contenido_tmp / "mundos" / "mundo_2.json")
    datos["codigo"] = "mundo_1"
    _escribir(contenido_tmp / "mundos" / "mundo_2.json", datos)

    with pytest.raises(ErrorContenido, match="mundo repetido: mundo_1"):
        cargar_contenido(contenido_tmp)


@pytest.mark.django_db
def test_logro_que_apunta_a_mundo_inexistente_se_detecta(contenido_tmp):
    datos = _leer(contenido_tmp / "logros.json")
    datos["logros"][1]["mundo"] = "mundo_99"
    _escribir(contenido_tmp / "logros.json", datos)

    with pytest.raises(ErrorContenido, match="mundo_99"):
        cargar_contenido(contenido_tmp)


@pytest.mark.django_db
def test_json_mal_formado_se_reporta_con_la_linea(contenido_tmp):
    _mundo_1(contenido_tmp).write_text("{ esto no es json", encoding="utf-8")

    with pytest.raises(ErrorContenido, match="línea 1"):
        cargar_contenido(contenido_tmp)


@pytest.mark.django_db
def test_solo_validar_no_escribe(contenido_tmp):
    cargar_contenido(contenido_tmp, solo_validar=True)

    assert Mundo.objects.count() == 0


@pytest.mark.django_db
def test_comando_reporta_resumen_y_falla_con_contenido_invalido(contenido_tmp, capsys):
    call_command("cargar_contenido", directorio=contenido_tmp)
    assert "Mundos: 5 creados" in capsys.readouterr().out

    _mundo_1(contenido_tmp).write_text("{}", encoding="utf-8")
    with pytest.raises(CommandError):
        call_command("cargar_contenido", directorio=contenido_tmp)
