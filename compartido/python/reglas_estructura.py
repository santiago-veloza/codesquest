

import ast


def _usa_nodo(arbol, regla):
    clase = getattr(ast, regla["nodo"])
    return any(isinstance(nodo, clase) for nodo in ast.walk(arbol))


def _min_funciones(arbol, regla):
    definidas = [n for n in ast.walk(arbol) if isinstance(n, ast.FunctionDef)]
    return len(definidas) >= regla["cantidad"]


def _prohibe_literal(arbol, regla):
    prohibido = regla["valor"]
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Constant) and not isinstance(nodo.value, bool):
            if type(nodo.value) in (int, float) and type(prohibido) in (int, float):
                if nodo.value == prohibido:
                    return False
            elif nodo.value == prohibido:
                return False
    return True


def _usa_funcion(arbol, regla):
    return any(
        isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == regla["nombre"]
        for n in ast.walk(arbol)
    )


EVALUADORES_REGLA = {
    "usa_nodo": _usa_nodo,
    "min_funciones": _min_funciones,
    "prohibe_literal": _prohibe_literal,
    "usa_funcion": _usa_funcion,
}


def evaluar_reglas(arbol, reglas):
    """Devuelve una lista con {regla, cumple, mensaje} por cada regla, en el mismo orden."""
    return [
        {
            "regla": r["regla"],
            "cumple": bool(EVALUADORES_REGLA[r["regla"]](arbol, r)),
            "mensaje": r.get("mensaje", ""),
        }
        for r in reglas
    ]
