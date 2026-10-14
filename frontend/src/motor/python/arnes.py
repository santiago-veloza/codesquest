"""Arnés de ejecución de CODEQUEST. Corre DENTRO de Pyodide (navegador y golden tests en Node).

Recibe una solicitud en JSON, ejecuta el código del estudiante en un espacio aislado y devuelve en
JSON: salida, variables finales, acciones de juego encoladas, error (si lo hubo) y el resultado de
las reglas de estructura (AST).

Este archivo no conoce el navegador: la interfaz es `ejecutar_solicitud(json) -> json`.
"""

import ast
import builtins
import difflib
import json
import sys

ARCHIVO_CODIGO = "<codigo>"
ARCHIVO_PREPARACION = "<preparacion>"
# Módulos que dan acceso al entorno de JavaScript: el código del estudiante no los necesita.
MODULOS_BLOQUEADOS = frozenset({"js", "pyodide", "pyodide_js", "_pyodide"})
PROFUNDIDAD_MAXIMA_VALOR = 4
ELEMENTOS_MAXIMOS_VALOR = 50
LARGO_MAXIMO_REPR = 200


class SalidaExcesiva(Exception):
    """El programa escribió más texto del permitido (p. ej. un print dentro de un bucle infinito)."""


class AccionesExcesivas(Exception):
    """El programa encoló más acciones de juego de las que la escena puede reproducir."""


class _SalidaLimitada:
    def __init__(self, limite):
        self.partes = []
        self.largo = 0
        self.limite = limite

    def write(self, texto):
        texto = str(texto)
        self.largo += len(texto)
        if self.largo > self.limite:
            raise SalidaExcesiva(f"Se superó el límite de {self.limite} caracteres de salida.")
        self.partes.append(texto)
        return len(texto)

    def flush(self):
        pass

    def texto(self):
        return "".join(self.partes)


# Las reglas de estructura (evaluar_reglas) vienen de compartido/python/reglas_estructura.py, que se
# carga en el mismo espacio de nombres ANTES de este archivo (el servidor usa la misma fuente).


# --- Captura de variables ---


def _nombre_tipo(valor):
    return type(valor).__name__


def _a_json(valor, profundidad=0):
    """Convierte a un valor JSON seguro. Devuelve (ok, valor)."""
    if valor is None or isinstance(valor, (bool, int, str)):
        return True, valor
    if isinstance(valor, float):
        return (valor == valor and valor not in (float("inf"), float("-inf"))), valor
    if profundidad >= PROFUNDIDAD_MAXIMA_VALOR:
        return False, None
    if isinstance(valor, (list, tuple)) and len(valor) <= ELEMENTOS_MAXIMOS_VALOR:
        convertidos = [_a_json(v, profundidad + 1) for v in valor]
        return all(ok for ok, _ in convertidos), [v for _, v in convertidos]
    if isinstance(valor, dict) and len(valor) <= ELEMENTOS_MAXIMOS_VALOR and all(isinstance(k, str) for k in valor):
        convertidos = {k: _a_json(v, profundidad + 1) for k, v in valor.items()}
        return all(ok for ok, _ in convertidos.values()), {k: v for k, (_, v) in convertidos.items()}
    return False, None


def capturar_variables(espacio, ocultos):
    variables = {}
    for nombre, valor in espacio.items():
        if nombre.startswith("_") or nombre in ocultos or type(valor).__name__ == "module":
            continue
        ok, convertido = _a_json(valor)
        texto = repr(valor)
        variables[nombre] = {
            "tipo": "function" if callable(valor) else _nombre_tipo(valor),
            "valor": convertido if ok else None,
            "serializable": ok,
            "repr": texto if len(texto) <= LARGO_MAXIMO_REPR else texto[:LARGO_MAXIMO_REPR] + "…",
        }
    return variables


# --- Errores ---


def _linea_del_error(error):
    if isinstance(error, SyntaxError):
        return error.lineno
    linea = None
    rastro = error.__traceback__
    while rastro is not None:
        if rastro.tb_frame.f_code.co_filename == ARCHIVO_CODIGO:
            linea = rastro.tb_lineno
        rastro = rastro.tb_next
    return linea


def describir_error(error, nombres_conocidos):
    descripcion = {"tipo": type(error).__name__, "mensaje": str(error), "linea": _linea_del_error(error)}
    nombre = getattr(error, "name", None)
    if isinstance(error, NameError) and nombre:
        descripcion["nombre"] = nombre
        parecidos = difflib.get_close_matches(nombre, nombres_conocidos, n=1)
        if parecidos:
            descripcion["sugerencia"] = parecidos[0]
    if isinstance(error, SyntaxError) and error.text:
        descripcion["texto_linea"] = error.text.rstrip("\n")
    return descripcion


# --- Ejecución ---


def _import_restringido(nombre, *args, **kwargs):
    if nombre.split(".")[0] in MODULOS_BLOQUEADOS:
        raise ImportError(f"El módulo '{nombre}' no está disponible en CODEQUEST.")
    return builtins.__import__(nombre, *args, **kwargs)


def _crear_funcion_juego(nombre, acciones, limite):
    def accion(*argumentos):
        if len(acciones) >= limite:
            raise AccionesExcesivas(f"Se superó el límite de {limite} acciones.")
        acciones.append({"tipo": nombre, "argumentos": [a for a in argumentos if isinstance(a, (int, float, str, bool))]})

    accion.__name__ = nombre
    return accion


def ejecutar(solicitud):
    codigo = solicitud["codigo"]
    limites = solicitud["limites"]
    resultado = {"salida": "", "variables": {}, "acciones": [], "error": None, "reglas": []}

    try:
        arbol = ast.parse(codigo, ARCHIVO_CODIGO)
    except SyntaxError as error:  # incluye IndentationError
        resultado["error"] = describir_error(error, [])
        return resultado
    resultado["reglas"] = evaluar_reglas(arbol, solicitud.get("reglas", []))

    acciones = []
    salida = _SalidaLimitada(limites["salida"])
    entradas = iter(solicitud.get("entradas", []))

    def input_simulado(mensaje=""):
        salida.write(mensaje)  # como Python real: el mensaje se muestra sin salto de línea
        try:
            return str(next(entradas))
        except StopIteration:
            raise EOFError("No hay más datos de entrada para input().") from None

    propios = dict(vars(builtins))
    propios.update({"input": input_simulado, "__import__": _import_restringido})
    funciones_juego = {
        nombre: _crear_funcion_juego(nombre, acciones, limites["acciones"]) for nombre in solicitud.get("funciones_juego", [])
    }
    espacio = {"__name__": "__main__", "__builtins__": propios, **funciones_juego}

    # La preparación de la variante (solo asignaciones literales, validadas al cargar el contenido)
    # crea las variables que el estudiante encuentra "ya en memoria". Se escribe en Python para
    # conservar el tipo exacto: 3.0 es float y 3 es int (JSON no los distingue).
    preparacion = solicitud.get("preparacion")
    if preparacion:
        try:
            exec(compile(preparacion, ARCHIVO_PREPARACION, "exec"), espacio)  # noqa: S102
        except Exception as error:
            resultado["error"] = {"tipo": "PreparacionInvalida", "mensaje": str(error), "linea": None}
            return resultado

    stdout_original = sys.stdout
    sys.stdout = salida
    try:
        exec(compile(arbol, ARCHIVO_CODIGO, "exec"), espacio)  # noqa: S102 — es el propósito del arnés
    except BaseException as error:  # SystemExit/KeyboardInterrupt también se reportan, no detienen el arnés
        resultado["error"] = describir_error(error, [n for n in espacio if not n.startswith("_")])
    finally:
        sys.stdout = stdout_original

    resultado["salida"] = salida.texto()
    resultado["acciones"] = acciones
    resultado["variables"] = capturar_variables(espacio, set(funciones_juego))
    return resultado


def ejecutar_solicitud(solicitud_json):
    return json.dumps(ejecutar(json.loads(solicitud_json)), ensure_ascii=False)
