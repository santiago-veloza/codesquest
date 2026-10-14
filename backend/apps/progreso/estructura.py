"""Revalidación en el servidor de las reglas de estructura (AST), SIN ejecutar el código.

Usa la misma fuente que el arnés del navegador: compartido/python/reglas_estructura.py.
"""

import ast
import importlib.util
from functools import cache

from django.conf import settings

MARCA_HUECO = "______"


@cache
def _modulo_reglas():
    ruta = settings.COMPARTIDO_PY_DIR / "reglas_estructura.py"
    especificacion = importlib.util.spec_from_file_location("reglas_estructura", ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


def reglas_del_desafio(pruebas: list[dict]) -> list[dict]:
    return [regla for prueba in pruebas if prueba.get("tipo") == "estructura" for regla in prueba["reglas"]]


def motivo_de_rechazo(codigo: str, pruebas: list[dict]) -> str | None:
    """Motivo por el que un intento reportado como correcto NO puede serlo, o None si es coherente."""
    if MARCA_HUECO in codigo:
        return "hueco_sin_completar"
    try:
        arbol = ast.parse(codigo)
    except SyntaxError:
        return "sintaxis_invalida"
    resultados = _modulo_reglas().evaluar_reglas(arbol, reglas_del_desafio(pruebas))
    if not all(r["cumple"] for r in resultados):
        return "estructura_invalida"
    return None
