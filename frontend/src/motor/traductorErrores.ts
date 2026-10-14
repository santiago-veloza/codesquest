/**
 * Traductor de errores: convierte un error de Python (o del motor) en un mensaje didáctico en
 * español, sin jerga. Cada mensaje dice QUÉ pasó y CÓMO corregirlo, en una o dos frases.
 * Nova lo usará para explicar el error en la escena.
 */
import { ERRORES_MOTOR, type ErrorPython } from './tipos'

export interface MensajeError {
  /** Código estable para el backend (intento_desafio.tipo_error) y las estadísticas. */
  tipoError: string
  titulo: string
  explicacion: string
  linea: number | null
  /** Pista adicional concreta (p. ej. "¿Quisiste decir «energia»?"). */
  sugerencia?: string
}

type Traduccion = (error: ErrorPython) => Omit<MensajeError, 'tipoError' | 'linea'>

const enLinea = (error: ErrorPython) => (error.linea ? ` en la línea ${error.linea}` : '')

const TRADUCCIONES: Record<string, Traduccion> = {
  SyntaxError: (e) => ({
    titulo: 'Python no entiende cómo está escrito',
    explicacion: `Hay algo mal escrito${enLinea(e)}. Revisa que no falten comillas, paréntesis o los dos puntos (:) al final de if, for, while o def.`,
  }),
  IndentationError: (e) => ({
    titulo: 'La sangría no es correcta',
    explicacion: `Los espacios al inicio de la línea${e.linea ? ` ${e.linea}` : ''} no están bien. Las líneas dentro de un if, for, while o def van corridas a la derecha con 4 espacios.`,
  }),
  TabError: (e) => ({
    titulo: 'Mezclaste tabulaciones y espacios',
    explicacion: `${enLinea(e) ? `En la línea ${e.linea} usaste` : 'Usaste'} tabulación y espacios a la vez para la sangría. Usa solo espacios (4 por nivel).`,
  }),
  NameError: (e) => ({
    titulo: 'Python no conoce ese nombre',
    explicacion: `Usaste «${e.nombre ?? '?'}»${enLinea(e)}, pero no existe. Revisa que esté bien escrito y que lo hayas creado antes de usarlo; si es texto, ponlo entre comillas.`,
    ...(e.sugerencia ? { sugerencia: `¿Quisiste decir «${e.sugerencia}»?` } : {}),
  }),
  TypeError: (e) => ({
    titulo: 'Estás mezclando tipos de datos',
    explicacion: e.mensaje.includes('concatenate')
      ? `No se puede unir texto con un número${enLinea(e)}. Convierte el número a texto con str(), o el texto a número con int() o float().`
      : `Una operación${enLinea(e)} usa un tipo de dato que no le sirve (por ejemplo, sumar texto y número, o llamar algo que no es una función).`,
  }),
  ZeroDivisionError: (e) => ({
    titulo: 'División entre cero',
    explicacion: `Intentaste dividir entre 0${enLinea(e)}. Ningún número se puede dividir entre cero: revisa el valor del divisor.`,
  }),
  ValueError: (e) => ({
    titulo: 'Un valor no tiene el formato esperado',
    explicacion: `Un valor no sirve para esa operación${enLinea(e)}. Por ejemplo, int("hola") falla porque "hola" no es un número.`,
  }),
  EOFError: () => ({
    titulo: 'Faltan datos de entrada',
    explicacion: 'Tu programa pidió más datos con input() de los que había. Revisa cuántas veces llamas a input().',
  }),
  IndexError: (e) => ({
    titulo: 'Posición fuera de la lista',
    explicacion: `Pediste una posición que no existe${enLinea(e)}. Recuerda que las posiciones empiezan en 0 y la última es largo − 1.`,
  }),
  KeyError: (e) => ({
    titulo: 'Esa clave no existe',
    explicacion: `Buscaste en un diccionario una clave que no tiene${enLinea(e)}: ${e.mensaje}. Revisa cómo está escrita.`,
  }),
  AttributeError: (e) => ({
    titulo: 'Ese dato no tiene esa función',
    explicacion: `Usaste algo con un punto (.) que ese tipo de dato no tiene${enLinea(e)}. Revisa el nombre después del punto.`,
  }),
  RecursionError: () => ({
    titulo: 'Una función se llama a sí misma sin parar',
    explicacion: 'Una función se llamó a sí misma demasiadas veces. Asegúrate de que tenga un caso en el que deje de llamarse.',
  }),
  ImportError: () => ({
    titulo: 'Módulo no disponible',
    explicacion: 'Ese módulo no se puede usar en CODEQUEST. Para los desafíos no necesitas importar nada especial.',
  }),
  SalidaExcesiva: () => ({
    titulo: 'Tu programa escribió demasiado',
    explicacion: 'Tu programa mostró muchísimo texto y lo detuvimos. Puede que haya un print dentro de un bucle que nunca termina.',
  }),
  AccionesExcesivas: () => ({
    titulo: 'Demasiadas acciones',
    explicacion: 'Tu personaje recibió demasiadas órdenes y lo detuvimos. Revisa que tus bucles terminen.',
  }),
  [ERRORES_MOTOR.tiempoAgotado]: () => ({
    titulo: 'Tu programa no terminó a tiempo',
    explicacion: 'Lo detuvimos porque tardó demasiado. Seguramente hay un bucle infinito: revisa que la condición del while cambie en algún momento.',
  }),
  [ERRORES_MOTOR.huecoSinCompletar]: () => ({
    titulo: 'Falta completar el código',
    explicacion: 'Todavía queda un hueco ______ en tu código. Reemplázalo por tu respuesta antes de ejecutar.',
  }),
  [ERRORES_MOTOR.cargaFallida]: () => ({
    titulo: 'No se pudo preparar Python',
    explicacion: 'Python no se pudo cargar en tu navegador. Revisa tu conexión y recarga la página.',
  }),
}

const TRADUCCION_GENERICA: Traduccion = (e) => ({
  titulo: 'Tu programa encontró un error',
  explicacion: `Ocurrió un error (${e.tipo})${enLinea(e)}. Revisa esa línea con calma: suele ser un detalle pequeño.`,
})

export function traducirError(error: ErrorPython): MensajeError {
  const traduccion = (TRADUCCIONES[error.tipo] ?? TRADUCCION_GENERICA)(error)
  return { tipoError: error.tipo, linea: error.linea, ...traduccion }
}
