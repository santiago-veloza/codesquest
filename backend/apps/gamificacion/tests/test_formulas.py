"""Fórmulas puras de XP y nivel (sin base de datos)."""

import pytest

from apps.gamificacion.servicios import nivel_para, umbral_de_nivel, xp_por_desafio
from config import juego

XP_BASE = 10


@pytest.mark.parametrize(
    ("pistas", "primer_intento", "esperado"),
    [
        (0, True, XP_BASE + juego.BONUS_PRIMER_INTENTO),
        (0, False, XP_BASE),
        (1, False, XP_BASE - juego.PENALIZACION_POR_PISTA),
        (1, True, XP_BASE - juego.PENALIZACION_POR_PISTA + juego.BONUS_PRIMER_INTENTO),
        # Con muchas pistas no baja del mínimo (la mitad de la XP base).
        (juego.PISTAS_POR_DESAFIO, False, int(XP_BASE * juego.FRACCION_MINIMA_XP)),
    ],
)
def test_xp_por_desafio(pistas, primer_intento, esperado):
    assert xp_por_desafio(XP_BASE, pistas, primer_intento) == esperado


def test_el_nivel_1_empieza_en_cero():
    assert umbral_de_nivel(juego.NIVEL_INICIAL) == 0
    assert nivel_para(0) == juego.NIVEL_INICIAL


@pytest.mark.parametrize("nivel", [2, 3, 4, 5, 6])
def test_bordes_de_nivel(nivel):
    umbral = umbral_de_nivel(nivel)

    assert nivel_para(umbral - 1) == nivel - 1
    assert nivel_para(umbral) == nivel


def test_los_umbrales_crecen():
    umbrales = [umbral_de_nivel(n) for n in range(1, 10)]

    assert umbrales == sorted(set(umbrales))
