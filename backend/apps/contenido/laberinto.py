"""Reglas del laberinto de cada mundo (datos en content/mundos/*.json, campo "mapa").

Leyenda: w = pared, c = camino, a = inicio, s = salida, e = enemigo (aparece sobre un camino),
1-9 = obstáculo (desafío con ese orden). Los laberintos tienen rutas alternativas: los obstáculos no
tienen por qué cerrar el paso, pero la salida solo se abre con TODOS resueltos.
Funciones puras: las usan la validación de contenido y las pruebas.
"""

from collections import deque

PARED = "w"
INICIO = "a"
SALIDA = "s"
ENEMIGO = "e"


def buscar(mapa: list[str], simbolo: str) -> list[tuple[int, int]]:
    return [(x, y) for y, fila in enumerate(mapa) for x, celda in enumerate(fila) if celda == simbolo]


def simbolos_obstaculo(mapa: list[str]) -> list[str]:
    return sorted({celda for fila in mapa for celda in fila if celda.isdigit()})


def _vecinos(mapa: list[str], x: int, y: int):
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= ny < len(mapa) and 0 <= nx < len(mapa[ny]):
            yield nx, ny


def alcanzables(mapa: list[str], bloqueados: frozenset[str]) -> set[tuple[int, int]]:
    """Casillas a las que se llega desde el inicio sin pisar paredes ni símbolos `bloqueados`."""
    inicio = buscar(mapa, INICIO)[0]
    vistos, cola = {inicio}, deque([inicio])
    while cola:
        x, y = cola.popleft()
        for v in _vecinos(mapa, x, y):
            celda = mapa[v[1]][v[0]]
            if v not in vistos and celda != PARED and celda not in bloqueados:
                vistos.add(v)
                cola.append(v)
    return vistos


def se_puede_terminar(mapa: list[str]) -> tuple[bool, list[str]]:
    """Simula al jugador: resuelve cada obstáculo al que puede llegar hasta resolverlos todos y
    comprueba que entonces la salida sea alcanzable. Devuelve (se_puede, obstáculos_inalcanzables)."""
    pendientes = set(simbolos_obstaculo(mapa))
    while True:
        zona = alcanzables(mapa, frozenset(pendientes | {SALIDA}))
        al_alcance = {
            mapa[ny][nx] for x, y in zona for nx, ny in _vecinos(mapa, x, y) if mapa[ny][nx] in pendientes
        }
        if not al_alcance:
            break
        pendientes -= al_alcance
    if pendientes:
        return False, sorted(pendientes)
    return buscar(mapa, SALIDA)[0] in alcanzables(mapa, frozenset()), []


def problemas_del_mapa(mapa: list[str], ordenes_desafios: list[int]) -> list[str]:
    """Devuelve la lista de problemas (vacía si el laberinto es válido)."""
    if len({len(fila) for fila in mapa}) != 1:
        return ["todas las filas del mapa deben tener el mismo largo."]
    problemas = []
    for simbolo, nombre in ((INICIO, "un inicio (a)"), (SALIDA, "una salida (s)")):
        if len(buscar(mapa, simbolo)) != 1:
            problemas.append(f"el mapa debe tener exactamente {nombre}.")
    if problemas:
        return problemas

    obstaculos = simbolos_obstaculo(mapa)
    esperados = sorted(str(orden) for orden in ordenes_desafios)
    if obstaculos != esperados:
        problemas.append(
            f"los obstáculos del mapa {obstaculos} deben coincidir con los desafíos {esperados}."
        )
    for simbolo in obstaculos:
        if len(buscar(mapa, simbolo)) != 1:
            problemas.append(f"el obstáculo {simbolo} debe aparecer una sola vez.")

    terminable, inalcanzables = se_puede_terminar(mapa)
    if inalcanzables:
        problemas.append(f"los obstáculos {inalcanzables} no se pueden alcanzar desde el inicio.")
    elif not terminable:
        problemas.append("la salida no es alcanzable desde el inicio.")
    return problemas
