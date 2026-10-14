

import json
import random
import sys
from collections import deque
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONTENIDO = RAIZ / "content" / "mundos"
sys.path.insert(0, str(RAIZ / "backend" / "apps" / "contenido"))
from laberinto import se_puede_terminar  # noqa: E402

# mundo: (ancho, alto, semilla, proporción de muros abiertos, enemigos)
MUNDOS = {
    1: (15, 11, 101, 0.10, 2),
    2: (21, 13, 202, 0.12, 3),
    3: (27, 15, 303, 0.15, 4),
    4: (33, 17, 404, 0.18, 5),
}
OBSTACULOS = 3
POSICIONES_OBSTACULOS = (0.3, 0.6, 0.85)  # fracción de la distancia máxima desde el inicio
DISTANCIA_MINIMA_ENEMIGO = 6  # casillas desde el inicio
PARED, CAMINO = "w", "c"
DIRECCIONES = ((1, 0), (-1, 0), (0, 1), (0, -1))


def generar_base(ancho, alto, rng):
    g = [[PARED] * ancho for _ in range(alto)]
    pila = [(1, 1)]
    g[1][1] = CAMINO
    while pila:
        x, y = pila[-1]
        vecinos = [
            (x + dx * 2, y + dy * 2, dx, dy)
            for dx, dy in DIRECCIONES
            if 0 < x + dx * 2 < ancho - 1 and 0 < y + dy * 2 < alto - 1 and g[y + dy * 2][x + dx * 2] == PARED
        ]
        if not vecinos:
            pila.pop()
            continue
        nx, ny, dx, dy = rng.choice(vecinos)
        g[y + dy][x + dx] = CAMINO
        g[ny][nx] = CAMINO
        pila.append((nx, ny))
    return g


def abrir_rutas(g, proporcion, rng):
    """Abre muros internos que separan dos pasillos (en línea recta): crea ciclos sin abrir salas."""
    alto, ancho = len(g), len(g[0])
    candidatos = [
        (x, y)
        for y in range(1, alto - 1)
        for x in range(1, ancho - 1)
        if g[y][x] == PARED
        and (
            (g[y][x - 1] == CAMINO and g[y][x + 1] == CAMINO and g[y - 1][x] == PARED and g[y + 1][x] == PARED)
            or (g[y - 1][x] == CAMINO and g[y + 1][x] == CAMINO and g[y][x - 1] == PARED and g[y][x + 1] == PARED)
        )
    ]
    for x, y in rng.sample(candidatos, round(len(candidatos) * proporcion)):
        g[y][x] = CAMINO


def distancias(g, origen):
    dist = {origen: 0}
    cola = deque([origen])
    while cola:
        x, y = cola.popleft()
        for dx, dy in DIRECCIONES:
            v = (x + dx, y + dy)
            if g[v[1]][v[0]] != PARED and v not in dist:
                dist[v] = dist[(x, y)] + 1
                cola.append(v)
    return dist


def es_callejon(g, x, y):
    return sum(g[y + dy][x + dx] != PARED for dx, dy in DIRECCIONES) == 1


def _terminable(g, inicio, fin):
    copia = [fila[:] for fila in g]
    copia[inicio[1]][inicio[0]] = "a"
    copia[fin[1]][fin[0]] = "s"
    return se_puede_terminar(["".join(f) for f in copia])[0]


def colocar(g, inicio, fin, enemigos, rng):
    dist = distancias(g, inicio)
    maximo = max(dist.values())
    alrededor = lambda c: {(c[0] + dx, c[1] + dy) for dx, dy in DIRECCIONES}  # noqa: E731
    reservadas = {inicio, fin} | alrededor(inicio) | alrededor(fin)
    # Obstáculos: preferir callejones (invitan a explorar) cerca de cada distancia objetivo, y solo
    # donde el laberinto siga siendo terminable (la salida está cerrada hasta resolverlos todos).
    for numero, fraccion in enumerate(POSICIONES_OBSTACULOS, start=1):
        objetivo = round(maximo * fraccion)
        libres = sorted(
            (c for c in dist if c not in reservadas),
            key=lambda c: (abs(dist[c] - objetivo), not es_callejon(g, *c), c),
        )
        for candidato in libres:
            g[candidato[1]][candidato[0]] = str(numero)
            if _terminable(g, inicio, fin):
                break
            g[candidato[1]][candidato[0]] = CAMINO
        else:
            raise RuntimeError(f"No hay lugar válido para el obstáculo {numero}")
        reservadas |= {candidato} | alrededor(candidato)
    # Enemigos: lejos del inicio y lo más separados posible entre sí.
    candidatos = [c for c in dist if dist[c] >= DISTANCIA_MINIMA_ENEMIGO and c not in reservadas]
    elegidos = [rng.choice(candidatos)]
    while len(elegidos) < enemigos:
        elegidos.append(max(candidatos, key=lambda c: min(abs(c[0] - e[0]) + abs(c[1] - e[1]) for e in elegidos)))
    for x, y in elegidos:
        g[y][x] = "e"


def generar(ancho, alto, semilla, proporcion, enemigos):
    rng = random.Random(semilla)
    g = generar_base(ancho, alto, rng)
    abrir_rutas(g, proporcion, rng)
    inicio, fin = (1, 1), (ancho - 2, alto - 2)
    colocar(g, inicio, fin, enemigos, rng)
    g[inicio[1]][inicio[0]] = "a"
    g[fin[1]][fin[0]] = "s"
    return ["".join(fila) for fila in g]


if __name__ == "__main__":
    for numero, parametros in MUNDOS.items():
        ruta = CONTENIDO / f"mundo_{numero}.json"
        mundo = json.loads(ruta.read_text(encoding="utf-8"))
        mundo["mapa"] = generar(*parametros)
        ruta.write_text(json.dumps(mundo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"mundo {numero}: {parametros[0]}x{parametros[1]}, {parametros[4]} enemigos")
        print("\n".join(mundo["mapa"]))
