"""Validación y carga idempotente del contenido (content/) en la base de datos.

Flujo: leer JSON -> validar con JSON Schema -> validar reglas entre archivos -> escribir todo en
una transacción. Si algo falla, no se escribe nada.
"""

import ast
import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from django.db import transaction
from jsonschema import Draft202012Validator

from apps.gamificacion.models import Logro
from config import juego

from .laberinto import problemas_del_mapa
from .models import Desafio, Mundo

CARPETA_ESQUEMAS = "esquemas"
CARPETA_MUNDOS = "mundos"
ARCHIVO_LOGROS = "logros.json"
CREADO, ACTUALIZADO, SIN_CAMBIOS = "creados", "actualizados", "sin_cambios"

# Campos que pasan del JSON al modelo. errores_tipicos solo lo usan los golden tests.
CAMPOS_DESAFIO = (
    "orden",
    "titulo",
    "dificultad",
    "enunciado",
    "codigo_base",
    "pistas",
    "pruebas",
    "variantes",
    "xp_base",
    "solucion_referencia",
)
CAMPOS_LOGRO = ("nombre", "descripcion", "icono", "criterio", "orden")


class ErrorContenido(Exception):
    def __init__(self, errores: list[str]):
        self.errores = errores
        super().__init__("Contenido inválido:\n" + "\n".join(f"  - {e}" for e in errores))


@dataclass
class ResumenCarga:
    mundos: Counter = field(default_factory=Counter)
    desafios: Counter = field(default_factory=Counter)
    logros: Counter = field(default_factory=Counter)


def cargar_contenido(directorio: Path, solo_validar: bool = False) -> ResumenCarga:
    mundos, logros = leer_y_validar(directorio)
    resumen = ResumenCarga()
    if solo_validar:
        return resumen
    with transaction.atomic():
        mundos_por_codigo = {}
        for datos_mundo in mundos:
            mundo, accion = _sincronizar(Mundo, datos_mundo["codigo"], _valores_mundo(datos_mundo))
            resumen.mundos[accion] += 1
            mundos_por_codigo[mundo.codigo] = mundo
            for datos_desafio in datos_mundo["desafios"]:
                valores = {c: datos_desafio.get(c, []) for c in CAMPOS_DESAFIO} | {"mundo": mundo}
                _, accion = _sincronizar(Desafio, datos_desafio["codigo"], valores)
                resumen.desafios[accion] += 1
        for datos_logro in logros:
            valores = {c: datos_logro[c] for c in CAMPOS_LOGRO}
            valores["mundo"] = mundos_por_codigo.get(datos_logro.get("mundo"))
            _, accion = _sincronizar(Logro, datos_logro["codigo"], valores)
            resumen.logros[accion] += 1
    return resumen


def leer_y_validar(directorio: Path) -> tuple[list[dict], list[dict]]:
    """Devuelve (mundos, logros) ya validados o lanza ErrorContenido con TODOS los problemas."""
    errores: list[str] = []
    esquema_mundo = _cargar_esquema(directorio, "mundo.schema.json")
    esquema_logros = _cargar_esquema(directorio, "logros.schema.json")

    archivos_mundo = sorted((directorio / CARPETA_MUNDOS).glob("*.json"))
    if not archivos_mundo:
        errores.append(f"No hay archivos de mundos en {directorio / CARPETA_MUNDOS}.")
    mundos = [m for m in (_leer(a, esquema_mundo, errores) for a in archivos_mundo) if m]
    datos_logros = _leer(directorio / ARCHIVO_LOGROS, esquema_logros, errores)
    logros = datos_logros["logros"] if datos_logros else []

    if not errores:
        errores.extend(_validar_reglas_entre_archivos(mundos, logros))
    if errores:
        raise ErrorContenido(errores)
    return mundos, logros


def _cargar_esquema(directorio: Path, nombre: str) -> dict:
    esquema = json.loads((directorio / CARPETA_ESQUEMAS / nombre).read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(esquema)
    return esquema


def _leer(archivo: Path, esquema: dict, errores: list[str]) -> dict | None:
    if not archivo.exists():
        errores.append(f"{archivo.name}: no existe.")
        return None
    try:
        datos = json.loads(archivo.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errores.append(f"{archivo.name}: JSON mal formado (línea {e.lineno}): {e.msg}")
        return None
    problemas = sorted(Draft202012Validator(esquema).iter_errors(datos), key=lambda e: list(e.path))
    for p in problemas:
        ruta = "/".join(str(x) for x in p.path) or "(raíz)"
        errores.append(f"{archivo.name} -> {ruta}: {p.message}")
    return None if problemas else datos


def _validar_reglas_entre_archivos(mundos: list[dict], logros: list[dict]) -> list[str]:
    """Reglas que JSON Schema no puede expresar: unicidad entre archivos y referencias."""
    errores = []
    errores += _duplicados("código de mundo", [m["codigo"] for m in mundos])
    errores += _duplicados("orden de mundo", [m["orden"] for m in mundos])
    errores += _duplicados("código de desafío", [d["codigo"] for m in mundos for d in m["desafios"]])
    errores += _duplicados("código de logro", [lg["codigo"] for lg in logros])

    for mundo in mundos:
        if mundo.get("mapa"):
            ordenes = [d["orden"] for d in mundo["desafios"]]
            errores += [f"Mapa de {mundo['codigo']}: {p}" for p in problemas_del_mapa(mundo["mapa"], ordenes)]
        errores += _duplicados(
            f"orden de desafío en {mundo['codigo']}", [d["orden"] for d in mundo["desafios"]]
        )
        for d in mundo["desafios"]:
            if not d["codigo"].startswith(f"{mundo['orden']}."):
                errores.append(
                    f"Desafío {d['codigo']}: debe empezar por '{mundo['orden']}.' (mundo {mundo['codigo']})."
                )
            if len(d["pistas"]) != juego.PISTAS_POR_DESAFIO:
                errores.append(f"Desafío {d['codigo']}: debe tener {juego.PISTAS_POR_DESAFIO} pistas.")
            for n, variante in enumerate(d.get("variantes", []), start=1):
                problema = _problema_preparacion(variante.get("preparacion"))
                if problema:
                    errores.append(f"Desafío {d['codigo']}, variante {n}: {problema}")

    codigos_mundo = {m["codigo"] for m in mundos}
    for lg in logros:
        if "mundo" in lg and lg["mundo"] not in codigos_mundo:
            errores.append(f"Logro {lg['codigo']}: el mundo '{lg['mundo']}' no existe.")
    return errores


def _problema_preparacion(preparacion: str | None) -> str | None:
    """La preparación de una variante solo puede asignar valores literales (nada de llamadas ni lógica).

    Se analiza con ast, sin ejecutarla: el servidor nunca ejecuta código.
    """
    if preparacion is None:
        return None
    try:
        arbol = ast.parse(preparacion)
    except SyntaxError as error:
        return f"la preparación no es Python válido (línea {error.lineno})."
    for sentencia in arbol.body:
        if not (
            isinstance(sentencia, ast.Assign) and all(isinstance(t, ast.Name) for t in sentencia.targets)
        ):
            return "la preparación solo puede tener asignaciones simples (nombre = valor)."
        try:
            ast.literal_eval(sentencia.value)
        except ValueError:
            return f"la preparación debe asignar valores literales (línea {sentencia.lineno})."
    return None


def _duplicados(que: str, valores: list) -> list[str]:
    return [f"{que.capitalize()} repetido: {v}" for v, n in Counter(valores).items() if n > 1]


def _valores_mundo(datos: dict) -> dict:
    return {
        "orden": datos["orden"],
        "nombre": datos["nombre"],
        "conceptos": datos["conceptos"],
        "descripcion": datos["descripcion"],
        "activo": datos.get("activo", True),
        "funciones_juego": datos.get("funciones_juego", []),
        "mapa": datos.get("mapa", []),
    }


def _sincronizar(modelo, codigo: str, valores: dict):
    """Crea o actualiza por `codigo`; solo escribe si algo cambió. Devuelve (instancia, acción)."""
    instancia = modelo.objects.filter(codigo=codigo).first()
    if instancia is None:
        return modelo.objects.create(codigo=codigo, **valores), CREADO
    cambiados = [campo for campo, valor in valores.items() if getattr(instancia, campo) != valor]
    if not cambiados:
        return instancia, SIN_CAMBIOS
    for campo in cambiados:
        setattr(instancia, campo, valores[campo])
    instancia.save(update_fields=cambiados)
    return instancia, ACTUALIZADO
