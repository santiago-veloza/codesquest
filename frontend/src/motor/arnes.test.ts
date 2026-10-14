// @vitest-environment node
/** Pruebas del arnés de Python ejecutado en Pyodide real (Python 3.14, igual que en el navegador). */
import { beforeAll, describe, expect, it } from 'vitest'

import { MOTOR } from '../config/juego'
import { TIEMPO_CARGA_PYODIDE_MS, crearEjecutorNode } from '../pruebas/pyodideNode'
import type { EjecutarFn, SolicitudEjecucion } from './tipos'

let ejecutar: EjecutarFn
const LIMITES = { salida: MOTOR.limiteSalida, acciones: MOTOR.limiteAcciones }
const correr = (codigo: string, extra: Partial<SolicitudEjecucion> = {}) => ejecutar({ codigo, limites: LIMITES, ...extra })

beforeAll(async () => {
  ejecutar = await crearEjecutorNode()
}, TIEMPO_CARGA_PYODIDE_MS)

describe('arnés de ejecución', () => {
  it('captura la salida de print', async () => {
    const r = await correr('print("Bienvenido,", "Ada")\nprint(1 + 2)')

    expect(r.error).toBeNull()
    expect(r.salida).toBe('Bienvenido, Ada\n3\n')
  })

  it('captura las variables con su tipo y valor', async () => {
    const r = await correr('energia = 100\nnombre = "Ada"\nvida = 7.5\nactivo = True\nmochila = [1, "llave"]')

    expect(r.variables.energia).toMatchObject({ tipo: 'int', valor: 100 })
    expect(r.variables.nombre).toMatchObject({ tipo: 'str', valor: 'Ada' })
    expect(r.variables.vida).toMatchObject({ tipo: 'float', valor: 7.5 })
    expect(r.variables.activo).toMatchObject({ tipo: 'bool', valor: true })
    expect(r.variables.mochila).toMatchObject({ tipo: 'list', valor: [1, 'llave'] })
  })

  it('input() usa las entradas simuladas y muestra el mensaje como Python real', async () => {
    const r = await correr('nombre = input("¿Cómo te llamas? ")\nprint("Hola, " + nombre)', { entradas: ['Ada'] })

    expect(r.salida).toBe('¿Cómo te llamas? Hola, Ada\n')
  })

  it('input() sin entradas disponibles produce EOFError', async () => {
    const r = await correr('x = input()')

    expect(r.error?.tipo).toBe('EOFError')
  })

  it('la preparación de la variante crea variables con su tipo exacto (3.0 es float)', async () => {
    const r = await correr('total = precio * cantidad', { preparacion: 'precio = 3.0\ncantidad = 2' })

    expect(r.variables.precio).toMatchObject({ tipo: 'float', valor: 3 })
    expect(r.variables.total).toMatchObject({ tipo: 'float', repr: '6.0' })
  })

  it('una preparación inválida se reporta como problema del contenido, no del estudiante', async () => {
    const r = await correr('x = 1', { preparacion: 'precio = (' })

    expect(r.error?.tipo).toBe('PreparacionInvalida')
  })

  it('un error de sintaxis indica la línea y no ejecuta nada', async () => {
    const r = await correr('x = 1\nprint("hola"')

    expect(r.error).toMatchObject({ tipo: 'SyntaxError', linea: 2 })
    expect(r.salida).toBe('')
  })

  it('un error de sangría se reporta como IndentationError', async () => {
    const r = await correr('if True:\nprint("x")')

    expect(r.error?.tipo).toBe('IndentationError')
  })

  it('NameError incluye el nombre y sugiere el parecido', async () => {
    const r = await correr('energia = 100\nprint(enrgia)')

    expect(r.error).toMatchObject({ tipo: 'NameError', nombre: 'enrgia', sugerencia: 'energia', linea: 2 })
  })

  it('conserva la salida producida antes del error', async () => {
    const r = await correr('print("antes")\nx = 1 / 0')

    expect(r.salida).toBe('antes\n')
    expect(r.error).toMatchObject({ tipo: 'ZeroDivisionError', linea: 2 })
  })

  it('un print sin fin se detiene por exceso de salida (sin colgar el motor)', async () => {
    const r = await correr('while True:\n    print("bucle")')

    expect(r.error?.tipo).toBe('SalidaExcesiva')
    expect(r.salida.length).toBeLessThanOrEqual(MOTOR.limiteSalida)
  })

  it('las funciones de juego encolan acciones en orden', async () => {
    const r = await correr('avanzar()\nfor i in range(2):\n    saltar()\natacar()', {
      funciones_juego: ['avanzar', 'saltar', 'atacar'],
    })

    expect(r.acciones.map((a) => a.tipo)).toEqual(['avanzar', 'saltar', 'saltar', 'atacar'])
    expect(r.variables).not.toHaveProperty('avanzar')
  })

  it('no se puede encolar más acciones que el límite de la escena', async () => {
    const r = await correr('while True:\n    avanzar()', { funciones_juego: ['avanzar'] })

    expect(r.error?.tipo).toBe('AccionesExcesivas')
    expect(r.acciones).toHaveLength(MOTOR.limiteAcciones)
  })

  it('las funciones de juego no existen si el mundo no las desbloqueó', async () => {
    const r = await correr('avanzar()')

    expect(r.error).toMatchObject({ tipo: 'NameError', nombre: 'avanzar' })
  })

  it('bloquea los módulos que dan acceso a JavaScript', async () => {
    const r = await correr('import js')

    expect(r.error?.tipo).toBe('ImportError')
  })

  it('permite módulos normales de Python como math', async () => {
    const r = await correr('import math\nraiz = math.sqrt(16)')

    expect(r.error).toBeNull()
    expect(r.variables.raiz).toMatchObject({ valor: 4 })
    expect(r.variables).not.toHaveProperty('math')
  })

  it('una ejecución no ve las variables de la anterior', async () => {
    await correr('secreto = 42')
    const r = await correr('print(secreto)')

    expect(r.error?.tipo).toBe('NameError')
  })

  it('evalúa las reglas de estructura sobre el AST', async () => {
    const r = await correr('ataque = 12\nbonus = 5\ndano = ataque * 3 + bonus', {
      reglas: [
        { regla: 'usa_nodo', nodo: 'BinOp', mensaje: 'Usa una operación.' },
        { regla: 'prohibe_literal', valor: 41, mensaje: 'No escribas 41 a mano.' },
        { regla: 'usa_nodo', nodo: 'For', mensaje: 'Usa un for.' },
      ],
    })

    expect(r.reglas.map((x) => x.cumple)).toEqual([true, true, false])
  })

  it('prohibe_literal detecta el valor escrito a mano', async () => {
    const r = await correr('dano = 41', { reglas: [{ regla: 'prohibe_literal', valor: 41, mensaje: 'x' }] })

    expect(r.reglas[0]?.cumple).toBe(false)
  })

  it('valores que no son JSON (inf, objetos) se describen con repr', async () => {
    const r = await correr('infinito = float("inf")\nconjunto = {1, 2}')

    expect(r.variables.infinito).toMatchObject({ serializable: false, repr: 'inf' })
    expect(r.variables.conjunto).toMatchObject({ tipo: 'set', serializable: false })
  })
})
