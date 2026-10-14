// @vitest-environment node
/** Pruebas del evaluador con Pyodide real: desafíos modelados como los de la especificación. */
import { beforeAll, describe, expect, it } from 'vitest'

import { TIEMPO_CARGA_PYODIDE_MS, crearEjecutorNode } from '../pruebas/pyodideNode'
import { type DesafioEvaluable, evaluarDesafio, interpolar } from './evaluador'
import type { EjecutarFn } from './tipos'

let ejecutar: EjecutarFn
beforeAll(async () => {
  ejecutar = await crearEjecutorNode()
}, TIEMPO_CARGA_PYODIDE_MS)

const evaluar = (desafio: DesafioEvaluable, codigo: string) => evaluarDesafio(desafio, codigo, ejecutar)

// Como el 1.6 "Reparar el Banco de Datos": las variantes impiden escribir el resultado a mano.
const BANCO: DesafioEvaluable = {
  pruebas: [{ tipo: 'salida', esperado: 'Total: {{total}}' }],
  variantes: [
    { preparacion: 'precio = 8.5\ncantidad = 4', esperado: { total: '34.0' } },
    { preparacion: 'precio = 3.0\ncantidad = 2', esperado: { total: '6.0' } },
  ],
}

describe('evaluador de desafíos', () => {
  it('la solución correcta pasa todas las variantes', async () => {
    const v = await evaluar(BANCO, 'total = precio * cantidad\nprint("Total:", total)')

    expect(v).toMatchObject({ estado: 'correcto', variantesProbadas: 2 })
  })

  it('escribir el resultado a mano falla en otra variante y lo explica con su contexto', async () => {
    const v = await evaluar(BANCO, 'print("Total: 34.0")')

    expect(v.estado).toBe('incorrecto')
    if (v.estado !== 'incorrecto') return
    expect(v.contexto).toBe('Con precio = 3.0 y cantidad = 2')
    expect(v.fallos[0]).toBe('Tu programa mostró «Total: 34.0», pero se esperaba «Total: 6.0».')
  })

  it('un hueco sin completar se detecta sin ejecutar nada', async () => {
    const v = await evaluar(BANCO, 'total = ______\nprint("Total:", total)')

    expect(v).toMatchObject({ estado: 'error', error: { tipoError: 'HuecoSinCompletar', linea: 1 }, resultado: null })
  })

  it('un error de Python se devuelve traducido', async () => {
    const v = await evaluar(BANCO, 'total = precio * cantidd')

    expect(v.estado).toBe('error')
    if (v.estado !== 'error') return
    expect(v.error.tipoError).toBe('NameError')
    expect(v.error.sugerencia).toBe('¿Quisiste decir «cantidad»?')
  })

  describe('pruebas de variables (1.1 / 1.2)', () => {
    const CAJAS: DesafioEvaluable = {
      pruebas: [{ tipo: 'variables', variables: { energia: { valor: 100, tipo: 'int' }, nombre: { tipo: 'str' } } }],
    }

    it('acepta valor y tipo correctos', async () => {
      expect((await evaluar(CAJAS, 'energia = 100\nnombre = "Ada"')).estado).toBe('correcto')
    })

    it('distingue el número 100 del texto "100"', async () => {
      const v = await evaluar(CAJAS, 'energia = "100"\nnombre = "Ada"')

      expect(v).toMatchObject({ estado: 'incorrecto', fallos: ['«energia» debería ser un número entero (int), pero es un texto (str).'] })
    })

    it('informa el valor actual y el esperado', async () => {
      const v = await evaluar(CAJAS, 'energia = 10\nnombre = "Ada"')

      expect(v).toMatchObject({ fallos: ['«energia» vale 10, pero debería valer 100.'] })
    })

    it('avisa si la variable no existe', async () => {
      const v = await evaluar(CAJAS, 'enrgia = 100\nnombre = "Ada"')

      expect(v.estado === 'incorrecto' && v.fallos[0]).toMatch(/No existe la variable «energia»/)
    })
  })

  it('las reglas de estructura exigen la expresión (1.3: no escribir 41 a mano)', async () => {
    const OPERADORES: DesafioEvaluable = {
      pruebas: [
        { tipo: 'variables', variables: { dano: { valor: 41 } } },
        {
          tipo: 'estructura',
          reglas: [{ regla: 'prohibe_literal', valor: 41, mensaje: 'Calcula el daño con las variables, no escribas 41.' }],
        },
      ],
    }

    expect((await evaluar(OPERADORES, 'ataque = 12\nbonus = 5\ndano = ataque * 3 + bonus')).estado).toBe('correcto')
    expect(await evaluar(OPERADORES, 'ataque = 12\nbonus = 5\ndano = 41')).toMatchObject({
      fallos: ['Calcula el daño con las variables, no escribas 41.'],
    })
  })

  it('las entradas simuladas varían por variante (1.5)', async () => {
    const SALUDO: DesafioEvaluable = {
      pruebas: [{ tipo: 'salida', esperado: '¿Cómo te llamas? Hola, {{nombre}}' }],
      variantes: [
        { entradas: ['Ada'], esperado: { nombre: 'Ada' } },
        { entradas: ['Alan'], esperado: { nombre: 'Alan' } },
      ],
    }

    expect((await evaluar(SALUDO, 'nombre = input("¿Cómo te llamas? ")\nprint("Hola, " + nombre)')).estado).toBe('correcto')
    expect(await evaluar(SALUDO, 'nombre = input("¿Cómo te llamas? ")\nprint("Hola, Ada")')).toMatchObject({
      contexto: 'Con respondiendo «Alan» a input()',
    })
  })

  it('el estado de la escena compara las acciones del personaje (2.2)', async () => {
    const PUERTA: DesafioEvaluable = {
      funcionesJuego: ['abrir_puerta', 'buscar_llave'],
      pruebas: [{ tipo: 'estado_escena', esperado: { acciones: '{{acciones}}' } }],
      variantes: [
        { preparacion: 'llave = True', esperado: { acciones: ['abrir_puerta'] } },
        { preparacion: 'llave = False', esperado: { acciones: ['buscar_llave'] } },
      ],
    }

    expect((await evaluar(PUERTA, 'if llave:\n    abrir_puerta()\nelse:\n    buscar_llave()')).estado).toBe('correcto')
    expect(await evaluar(PUERTA, 'abrir_puerta()')).toMatchObject({
      contexto: 'Con llave = False',
      fallos: ['Tu personaje hizo: abrir_puerta. Se esperaba: buscar_llave.'],
    })
  })
})

describe('interpolar', () => {
  it('conserva el tipo cuando el texto es solo un marcador', () => {
    expect(interpolar('{{n}}', { n: 5 })).toBe(5)
    expect(interpolar(['{{a}}'], { a: true })).toEqual([true])
  })

  it('dentro de un texto muestra valores como Python', () => {
    expect(interpolar('x={{a}} y={{b}}', { a: true, b: 'hola' })).toBe('x=True y=hola')
  })

  it('un marcador sin valor es un error del contenido', () => {
    expect(() => interpolar('{{falta}}', {})).toThrow(/falta/)
  })
})
