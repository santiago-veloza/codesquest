import json

import pytest
from django.conf import settings

from apps.contenido.carga import ErrorContenido, cargar_contenido, leer_y_validar
from apps.contenido.laberinto import problemas_del_mapa, se_puede_terminar

# Pequeño laberinto válido: un solo camino a -> 1 -> 2 -> s.
VALIDO = [
    "wwwwwww",
    "wac1c2w",
    "wwwwwsw",
    "wwwwwww",
]


def test_laberinto_valido_no_tiene_problemas():
    assert problemas_del_mapa(VALIDO, [1, 2]) == []


def test_un_laberinto_lineal_se_puede_terminar():
    assert se_puede_terminar(VALIDO) == (True, [])


def test_rutas_alternativas_alrededor_de_un_obstaculo_son_validas():
    con_ciclo = ["wwwwww", "wac1sw", "wccccw", "wwwwww"]

    assert problemas_del_mapa(con_ciclo, [1]) == []


def test_los_enemigos_se_ubican_sobre_caminos_sin_romper_el_mapa():
    assert problemas_del_mapa(["wwwwwww", "wae1csw", "wwwwwww"], [1]) == []


def test_un_obstaculo_detras_de_otro_se_alcanza_resolviendo_el_primero():
    assert se_puede_terminar(["wwwwwwww", "wa1c2csw", "wwwwwwww"]) == (True, [])


@pytest.mark.parametrize(
    ("mapa", "ordenes", "fragmento"),
    [
        (["wwww", "wacw", "ww"], [], "mismo largo"),
        (["wwwww", "wccsw", "wwwww"], [], "un inicio"),
        (["wwwww", "waccw", "wwwww"], [], "una salida"),
        (["wwwwww", "wawcsw", "wwwwww"], [], "no es alcanzable"),
        (["wwwwwww", "wacsw1w", "wwwwwww"], [1], "no se pueden alcanzar"),
        (["wwwww", "wa1sw", "wwwww"], [1, 2], "deben coincidir"),
        (["wwwwwww", "wa1c1sw", "wwwwwww"], [1], "una sola vez"),
    ],
    ids=[
        "filas_desiguales",
        "sin_inicio",
        "sin_salida",
        "salida_aislada",
        "obstaculo_encerrado",
        "faltan_obstaculos",
        "obstaculo_repetido",
    ],
)
def test_laberintos_invalidos_se_detectan(mapa, ordenes, fragmento):
    assert any(fragmento in p for p in problemas_del_mapa(mapa, ordenes))


def test_los_laberintos_reales_son_validos_y_crecen_en_tamano():
    mundos, _ = leer_y_validar(settings.CONTENIDO_DIR)
    con_mapa = [m for m in mundos if m.get("mapa")]

    assert [m["orden"] for m in con_mapa] == [1, 2, 3, 4, 5]
    areas = [len(m["mapa"]) * len(m["mapa"][0]) for m in con_mapa]
    assert areas == sorted(areas)  # dificultad creciente
    enemigos = ["".join(m["mapa"]).count("e") for m in con_mapa]
    assert enemigos == sorted(enemigos) and enemigos[-1] > enemigos[-2]  # el final tiene más enemigos
    assert all(len(m["desafios"]) >= 2 for m in con_mapa)


@pytest.mark.django_db
def test_un_mapa_con_obstaculo_encerrado_no_se_carga(contenido_tmp):
    ruta = contenido_tmp / "mundos" / "mundo_1.json"
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    datos["mapa"] = ["wwwwwwwww", "wa1c2csww", "wwwwwwww3", "wwwwwwwww"]
    ruta.write_text(json.dumps(datos), encoding="utf-8")

    with pytest.raises(ErrorContenido, match="no se pueden alcanzar"):
        cargar_contenido(contenido_tmp)
