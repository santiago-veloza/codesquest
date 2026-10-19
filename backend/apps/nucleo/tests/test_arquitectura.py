"""Reglas de la arquitectura en capas del backend (docs/adr/0006-arquitectura-en-capas.md).

Cada app de apps/ se divide en:
  presentación  views.py, serializers.py, urls.py, admin.py, acceso.py, seguridad.py (HTTP y formato)
  lógica        servicios.py y módulos de dominio (laberinto, estructura, carga, ...): reglas del juego
  datos         models.py: esquema y restricciones de integridad

Estas pruebas leen el código (sin ejecutarlo) y fallan, con el archivo y la línea, si alguien rompe
una capa.
"""

import ast
from pathlib import Path

import pytest

APPS = Path(__file__).resolve().parents[2]
COMPARTIDO = APPS.parent / "compartido" / "python"

PRESENTACION = {"views", "serializers", "urls", "admin", "acceso", "seguridad", "excepciones"}
DATOS = {"models"}
ESCRITURAS_ORM = {
    "save",
    "delete",
    "create",
    "bulk_create",
    "bulk_update",
    "get_or_create",
    "update_or_create",
}
# Módulos de DRF que solo tienen sentido en la capa de presentación (HTTP).
DRF_PRESENTACION = (
    "rest_framework.views",
    "rest_framework.generics",
    "rest_framework.response",
    "rest_framework.request",
)
PELIGROSAS = {"exec", "eval", "compile", "__import__"}


def _modulos() -> list[Path]:
    return sorted(
        p
        for p in APPS.glob("*/*.py")
        if p.name != "__init__.py" and "migrations" not in p.parts and "tests" not in p.parts
    )


def _app_y_capa(ruta: Path) -> tuple[str, str]:
    return ruta.parent.name, ruta.stem


def _imports(ruta: Path) -> list[tuple[int, str]]:
    """(línea, módulo absoluto) de cada import, resolviendo los relativos (`from .x import y`)."""
    app, _ = _app_y_capa(ruta)
    resultado = []
    for nodo in ast.walk(ast.parse(ruta.read_text(encoding="utf-8"))):
        if isinstance(nodo, ast.Import):
            resultado += [(nodo.lineno, alias.name) for alias in nodo.names]
        elif isinstance(nodo, ast.ImportFrom):
            if nodo.level:  # relativo: dentro de la misma app
                base = f"apps.{app}" + (f".{nodo.module}" if nodo.module else "")
                nombres = [f"{base}.{a.name}" for a in nodo.names] if not nodo.module else [base]
                resultado += [(nodo.lineno, n) for n in nombres]
            else:
                resultado.append((nodo.lineno, nodo.module or ""))
    return resultado


def _capa_de(modulo: str) -> str | None:
    """'apps.progreso.servicios' -> 'servicios' (None si no es un módulo de una app)."""
    partes = modulo.split(".")
    return partes[2] if len(partes) >= 3 and partes[0] == "apps" else None


def _violaciones_de_import(filtro_origen, prohibido) -> list[str]:
    errores = []
    for ruta in _modulos():
        app, capa = _app_y_capa(ruta)
        if not filtro_origen(app, capa):
            continue
        for linea, modulo in _imports(ruta):
            motivo = prohibido(app, capa, modulo)
            if motivo:
                errores.append(f"{app}/{capa}.py:{linea} importa {modulo} ({motivo})")
    return errores


def test_las_vistas_no_escriben_en_la_base_de_datos():
    """Toda escritura pasa por servicios.py (transacciones y reglas en un solo lugar)."""
    errores = []
    for ruta in APPS.glob("*/views.py"):
        for nodo in ast.walk(ast.parse(ruta.read_text(encoding="utf-8"))):
            if (
                isinstance(nodo, ast.Call)
                and isinstance(nodo.func, ast.Attribute)
                and nodo.func.attr in ESCRITURAS_ORM
            ):
                errores.append(f"{ruta.parent.name}/views.py:{nodo.lineno} llama .{nodo.func.attr}()")
    assert errores == []


def test_los_modelos_no_dependen_de_capas_superiores():
    def prohibido(app, capa, modulo):
        if modulo.startswith("rest_framework"):
            return "los modelos no conocen HTTP"
        destino = _capa_de(modulo)
        if destino and destino not in DATOS:
            return "los modelos solo dependen de otros modelos"
        return None

    assert _violaciones_de_import(lambda app, capa: capa in DATOS, prohibido) == []


def test_la_logica_no_depende_de_la_presentacion():
    def prohibido(app, capa, modulo):
        if modulo.startswith(DRF_PRESENTACION):
            return "la lógica no responde HTTP"
        if _capa_de(modulo) in PRESENTACION - {"excepciones"}:
            return "la lógica no depende de vistas ni serializers"
        return None

    es_logica = lambda app, capa: capa not in PRESENTACION | DATOS  # noqa: E731
    assert _violaciones_de_import(es_logica, prohibido) == []


def test_ninguna_vista_depende_de_la_vista_de_otra_app():
    def prohibido(app, capa, modulo):
        partes = modulo.split(".")
        if _capa_de(modulo) == "views" and partes[1] != app:
            return "lo compartido va en un módulo propio (p. ej. progreso/acceso.py)"
        return None

    assert _violaciones_de_import(lambda app, capa: capa == "views", prohibido) == []


def test_los_servicios_no_forman_ciclos_entre_apps():
    """progreso.servicios usa gamificacion.servicios; lo contrario crearía un ciclo."""
    grafo: dict[str, set[str]] = {}
    for ruta in APPS.glob("*/servicios.py"):
        app = ruta.parent.name
        grafo[app] = {
            m.split(".")[1]
            for _, m in _imports(ruta)
            if _capa_de(m) == "servicios" and m.split(".")[1] != app
        } | {m.split(".")[1] for _, m in _imports(ruta) if m.startswith("apps.") and m.count(".") == 1}

    def visitar(app, camino):
        if app in camino:
            raise AssertionError(f"ciclo entre servicios: {' -> '.join([*camino, app])}")
        for siguiente in grafo.get(app, ()):
            if siguiente in grafo:
                visitar(siguiente, [*camino, app])

    for app in grafo:
        visitar(app, [])


@pytest.mark.parametrize("raiz", [APPS, COMPARTIDO], ids=["apps", "compartido"])
def test_el_servidor_nunca_ejecuta_codigo_de_estudiantes(raiz):
    """El código del estudiante solo se analiza con ast (ADR-0004): nada de exec/eval/subprocess."""
    errores = []
    for ruta in raiz.rglob("*.py"):
        if "tests" in ruta.parts or "migrations" in ruta.parts:
            continue
        for nodo in ast.walk(ast.parse(ruta.read_text(encoding="utf-8"))):
            if isinstance(nodo, ast.Call) and isinstance(nodo.func, ast.Name) and nodo.func.id in PELIGROSAS:
                errores.append(f"{ruta.name}:{nodo.lineno} llama {nodo.func.id}()")
            if isinstance(nodo, (ast.Import, ast.ImportFrom)):
                nombres = (
                    [a.name for a in nodo.names] if isinstance(nodo, ast.Import) else [nodo.module or ""]
                )
                errores += [
                    f"{ruta.name}:{nodo.lineno} importa {n}"
                    for n in nombres
                    if n.split(".")[0] == "subprocess"
                ]
            if (
                isinstance(nodo, ast.Attribute)
                and nodo.attr in {"system", "popen"}
                and getattr(nodo.value, "id", "") == "os"
            ):
                errores.append(f"{ruta.name}:{nodo.lineno} usa os.{nodo.attr}")
    assert errores == []
