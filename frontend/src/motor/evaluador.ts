/**
 * Evaluador de desafíos. Ejecuta el código del estudiante con cada variante y lo compara con las
 * pruebas del desafío (definidas como datos en content/mundos/*.json).
 *
 * El veredicto del cliente es orientativo: el servidor revalida la estructura (AST) y es la única
 * fuente de verdad de XP y logros (ver ADR de ejecución).
 */
import { MOTOR } from '../config/juego'
import { type MensajeError, traducirError } from './traductorErrores'
import {
  ERRORES_MOTOR,
  type EjecutarFn,
  type ReglaEstructura,
  type ResultadoEjecucion,
  type ValorSimple,
  type VariableCapturada,
} from './tipos'

export type Prueba =
  | { tipo: 'salida'; esperado: string }
  | { tipo: 'variables'; variables: Record<string, { valor?: ValorSimple; tipo?: string }> }
  | { tipo: 'estado_escena'; esperado: Record<string, ValorSimple> }
  | { tipo: 'estructura'; reglas: ReglaEstructura[] }

export interface Variante {
  /** Python que crea las variables de la variante: "precio = 3.0\ncantidad = 2". */
  preparacion?: string
  entradas?: string[]
  esperado?: Record<string, ValorSimple>
}

export interface DesafioEvaluable {
  pruebas: Prueba[]
  variantes?: Variante[]
  funcionesJuego?: string[]
}

export type Veredicto =
  | { estado: 'correcto'; resultado: ResultadoEjecucion; variantesProbadas: number }
  | { estado: 'incorrecto'; fallos: string[]; contexto: string | null; resultado: ResultadoEjecucion }
  | { estado: 'error'; error: MensajeError; contexto: string | null; resultado: ResultadoEjecucion | null }

const TOLERANCIA_DECIMAL = 1e-9
const NOMBRES_TIPO: Record<string, string> = {
  int: 'un número entero (int)',
  float: 'un número decimal (float)',
  str: 'un texto (str)',
  bool: 'un valor lógico, True o False (bool)',
  list: 'una lista (list)',
  dict: 'un diccionario (dict)',
  NoneType: 'vacío (None)',
  function: 'una función',
}

export async function evaluarDesafio(desafio: DesafioEvaluable, codigo: string, ejecutar: EjecutarFn): Promise<Veredicto> {
  if (codigo.includes(MOTOR.marcaHueco)) {
    const error = traducirError({ tipo: ERRORES_MOTOR.huecoSinCompletar, mensaje: '', linea: lineaDelHueco(codigo) })
    return { estado: 'error', error, contexto: null, resultado: null }
  }

  const variantes = desafio.variantes?.length ? desafio.variantes : [{}]
  const reglas = desafio.pruebas.flatMap((p) => (p.tipo === 'estructura' ? p.reglas : []))
  let primerResultado: ResultadoEjecucion | null = null

  for (const [indice, variante] of variantes.entries()) {
    const resultado = await ejecutar({
      codigo,
      preparacion: variante.preparacion ?? '',
      entradas: variante.entradas ?? [],
      funciones_juego: desafio.funcionesJuego ?? [],
      // La estructura no depende de la variante: se analiza una sola vez.
      reglas: indice === 0 ? reglas : [],
      limites: { salida: MOTOR.limiteSalida, acciones: MOTOR.limiteAcciones },
    })
    primerResultado ??= resultado
    const contexto = variantes.length > 1 ? describirVariante(variante) : null

    if (resultado.error) {
      return { estado: 'error', error: traducirError(resultado.error), contexto, resultado }
    }
    const fallos = comprobar(desafio.pruebas, resultado, variante.esperado ?? {}, indice === 0)
    if (fallos.length > 0) return { estado: 'incorrecto', fallos, contexto, resultado }
  }

  return { estado: 'correcto', resultado: primerResultado!, variantesProbadas: variantes.length }
}

function comprobar(
  pruebas: Prueba[],
  resultado: ResultadoEjecucion,
  valores: Record<string, ValorSimple>,
  incluirEstructura: boolean,
): string[] {
  const fallos: string[] = []
  for (const prueba of pruebas) {
    switch (prueba.tipo) {
      case 'salida':
        fallos.push(...comprobarSalida(String(interpolar(prueba.esperado, valores)), resultado.salida))
        break
      case 'variables':
        fallos.push(...comprobarVariables(prueba.variables, resultado.variables, valores))
        break
      case 'estado_escena':
        fallos.push(...comprobarEscena(interpolar(prueba.esperado, valores) as Record<string, ValorSimple>, resultado))
        break
      case 'estructura':
        if (incluirEstructura) fallos.push(...resultado.reglas.filter((r) => !r.cumple).map((r) => r.mensaje))
        break
    }
  }
  return fallos
}

const normalizarSalida = (texto: string) => texto.replace(/\r\n/g, '\n').replace(/\n+$/, '')

function comprobarSalida(esperado: string, obtenido: string): string[] {
  const mostrado = normalizarSalida(obtenido)
  if (mostrado === normalizarSalida(esperado)) return []
  return [`Tu programa mostró «${mostrado || '(nada)'}», pero se esperaba «${normalizarSalida(esperado)}».`]
}

function comprobarVariables(
  esperadas: Record<string, { valor?: ValorSimple; tipo?: string }>,
  obtenidas: Record<string, VariableCapturada>,
  valores: Record<string, ValorSimple>,
): string[] {
  const fallos: string[] = []
  for (const [nombre, { valor, tipo }] of Object.entries(esperadas)) {
    const variable = obtenidas[nombre]
    if (!variable) {
      fallos.push(`No existe la variable «${nombre}». Revisa que la hayas creado con ese nombre exacto.`)
    } else if (tipo && variable.tipo !== tipo) {
      fallos.push(`«${nombre}» debería ser ${nombreTipo(tipo)}, pero es ${nombreTipo(variable.tipo)}.`)
    } else if (valor !== undefined && !iguales(interpolar(valor, valores), variable.valor)) {
      fallos.push(`«${nombre}» vale ${variable.repr}, pero debería valer ${comoPython(interpolar(valor, valores))}.`)
    }
  }
  return fallos
}

function comprobarEscena(esperado: Record<string, ValorSimple>, resultado: ResultadoEjecucion): string[] {
  const estado: Record<string, ValorSimple> = { acciones: resultado.acciones.map((a) => a.tipo) }
  return Object.entries(esperado)
    .filter(([clave, valor]) => !iguales(valor, estado[clave] ?? null))
    .map(([clave, valor]) =>
      clave === 'acciones'
        ? `Tu personaje hizo: ${listar(estado.acciones)}. Se esperaba: ${listar(valor)}.`
        : `El estado «${clave}» de la escena no es el esperado.`,
    )
}

// --- Utilidades ---

/** Reemplaza {{marcadores}}. Si el texto es solo un marcador, conserva el tipo del valor (número, lista...). */
export function interpolar(valor: ValorSimple, valores: Record<string, ValorSimple>): ValorSimple {
  if (typeof valor === 'string') {
    const unico = /^\{\{(\w+)\}\}$/.exec(valor)
    if (unico) return valorDe(unico[1]!, valores)
    return valor.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => {
      const reemplazo = valorDe(clave, valores)
      return typeof reemplazo === 'string' ? reemplazo : comoPython(reemplazo)
    })
  }
  if (Array.isArray(valor)) return valor.map((v) => interpolar(v, valores))
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, interpolar(v, valores)]))
  }
  return valor
}

function valorDe(clave: string, valores: Record<string, ValorSimple>): ValorSimple {
  if (!(clave in valores)) throw new Error(`El contenido usa {{${clave}}}, pero la variante no define ese valor.`)
  return valores[clave]!
}

function iguales(a: ValorSimple, b: ValorSimple): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= TOLERANCIA_DECIMAL
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => iguales(v, b[i]!))
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const claves = Object.keys(a)
    return claves.length === Object.keys(b).length && claves.every((k) => k in b && iguales(a[k]!, b[k]!))
  }
  return a === b
}

/** Muestra un valor como lo escribiría Python (True/False, None, texto entre comillas). */
function comoPython(valor: ValorSimple): string {
  if (valor === null) return 'None'
  if (typeof valor === 'boolean') return valor ? 'True' : 'False'
  if (typeof valor === 'string') return `"${valor}"`
  if (Array.isArray(valor)) return `[${valor.map(comoPython).join(', ')}]`
  if (typeof valor === 'object') return `{${Object.entries(valor).map(([k, v]) => `"${k}": ${comoPython(v)}`).join(', ')}}`
  return String(valor)
}

const nombreTipo = (tipo: string) => NOMBRES_TIPO[tipo] ?? `de tipo ${tipo}`
const listar = (valor: ValorSimple | undefined) => (Array.isArray(valor) && valor.length ? valor.join(', ') : '(nada)')

function describirVariante(variante: Variante): string {
  const partes = (variante.preparacion ?? '')
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)
  if (variante.entradas?.length) partes.push(`respondiendo ${variante.entradas.map((e) => `«${e}»`).join(', ')} a input()`)
  return partes.length ? `Con ${partes.join(' y ')}` : 'En una de las pruebas'
}

function lineaDelHueco(codigo: string): number {
  return codigo.split('\n').findIndex((linea) => linea.includes(MOTOR.marcaHueco)) + 1
}
