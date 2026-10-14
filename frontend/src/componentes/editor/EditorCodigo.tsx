/**
 * Editor de código (CodeMirror 6) para Python.
 * - Resalta el hueco ______ que el estudiante debe completar.
 * - Tab sangra; Ctrl+M (Alt+Shift+M en Mac) activa el "modo foco" para salir con Tab (accesibilidad).
 * - Ctrl+Enter ejecuta.
 */
import { indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { Decoration, EditorView, MatchDecorator, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { basicSetup } from 'codemirror'
import { useEffect, useLayoutEffect, useRef } from 'react'

import { MOTOR } from '../../config/juego'
import estilos from './EditorCodigo.module.css'

interface Props {
  valor: string
  alCambiar: (valor: string) => void
  alEjecutar?: () => void
  /** Nombre accesible del editor (lo leen los lectores de pantalla). */
  etiqueta: string
  idDescripcion?: string
}

const CLASE_HUECO = 'cq-hueco'

// Colores de sintaxis con los tokens del sistema de diseño (contraste AA sobre --color-fondo).
const estiloSintaxis = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword], color: 'var(--color-acento)', fontWeight: '600' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--color-exito)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--color-aviso)' },
  { tag: [tags.comment, tags.lineComment], color: 'var(--color-texto-suave)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--color-primario)' },
  { tag: tags.operator, color: 'var(--color-texto)' },
])

const resaltadoHueco = ViewPlugin.fromClass(
  class {
    decoraciones
    private readonly marcador = new MatchDecorator({
      regexp: new RegExp(MOTOR.marcaHueco, 'g'),
      decoration: Decoration.mark({ class: CLASE_HUECO, attributes: { title: 'Completa este hueco' } }),
    })
    constructor(vista: EditorView) {
      this.decoraciones = this.marcador.createDeco(vista)
    }
    update(actualizacion: ViewUpdate) {
      this.decoraciones = this.marcador.updateDeco(actualizacion, this.decoraciones)
    }
  },
  { decorations: (plugin) => plugin.decoraciones },
)

const tema = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--color-fondo)', color: 'var(--color-texto)', fontSize: 'var(--texto-md)' },
    '.cm-content': { fontFamily: 'var(--fuente-codigo)', caretColor: 'var(--color-primario)' },
    '.cm-gutters': { backgroundColor: 'var(--color-superficie)', color: 'var(--color-texto-suave)', border: 'none' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgb(255 255 255 / 0.04)' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-primario)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'rgb(34 211 238 / 0.25)' },
    [`.${CLASE_HUECO}`]: {
      backgroundColor: 'rgb(240 171 252 / 0.18)',
      outline: '1px dashed var(--color-acento)',
      borderRadius: '2px',
    },
  },
  { dark: true },
)

export function EditorCodigo({ valor, alCambiar, alEjecutar, etiqueta, idDescripcion }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const vista = useRef<EditorView | null>(null)
  // Últimos valores y funciones: el editor no se recrea cuando cambian (perdería cursor e historial).
  const valorRef = useRef(valor)
  const alCambiarRef = useRef(alCambiar)
  const alEjecutarRef = useRef(alEjecutar)
  useLayoutEffect(() => {
    valorRef.current = valor
    alCambiarRef.current = alCambiar
    alEjecutarRef.current = alEjecutar
  })

  useEffect(() => {
    if (!contenedor.current) return
    const editor = new EditorView({
      parent: contenedor.current,
      state: EditorState.create({
        doc: valorRef.current,
        extensions: [
          keymap.of([{ key: 'Mod-Enter', run: () => (alEjecutarRef.current?.(), true) }, indentWithTab]),
          basicSetup,
          python(),
          syntaxHighlighting(estiloSintaxis),
          resaltadoHueco,
          tema,
          EditorView.contentAttributes.of({
            'aria-label': etiqueta,
            ...(idDescripcion ? { 'aria-describedby': idDescripcion } : {}),
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) alCambiarRef.current(u.state.doc.toString())
          }),
        ],
      }),
    })
    vista.current = editor
    return () => {
      editor.destroy()
      vista.current = null
    }
    // Solo se recrea si cambian sus atributos accesibles; "valor" se sincroniza en el efecto de abajo.
  }, [etiqueta, idDescripcion])

  // Sincroniza cambios externos (p. ej. "Reiniciar código") sin recrear el editor.
  useEffect(() => {
    const editor = vista.current
    if (editor && editor.state.doc.toString() !== valor) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valor } })
    }
  }, [valor])

  return <div ref={contenedor} className={estilos.editor} data-prueba="editor" />
}
