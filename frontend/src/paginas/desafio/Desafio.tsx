import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { obtenerDesafio } from '../../api/contenido'
import type { DesafioDetalle } from '../../api/tipos'
import { CLAVES_CONSULTA } from '../../api/clavesConsulta'
import { rutaMundo } from '../../app/rutas'
import { EditorCodigo } from '../../componentes/editor/EditorCodigo'
import { ResumenRecompensa } from '../../componentes/juego/ResumenRecompensa'
import { Aviso } from '../../componentes/ui/Aviso'
import { Boton } from '../../componentes/ui/Boton'
import { Cargando, ErrorVista } from '../../componentes/ui/EstadoVista'
import { textos } from '../../textos/es'
import { borrarBorrador, guardarBorrador, leerBorrador } from '../../utilidades/borradores'
import estilos from './Desafio.module.css'
import { PanelResultado } from './PanelResultado'
import { Pistas } from './Pistas'
import { useEjecucion } from './useEjecucion'

const ID_AYUDA_EDITOR = 'ayuda-editor'

/** Carga el desafío; la resolución vive en su propio componente con key para reiniciar su estado. */
export function Desafio() {
  const idDesafio = Number(useParams().idDesafio)
  const consulta = useQuery({ queryKey: CLAVES_CONSULTA.desafio(idDesafio), queryFn: () => obtenerDesafio(idDesafio) })

  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <ErrorVista mensaje={consulta.error.message} alReintentar={() => void consulta.refetch()} />
  return <ResolverDesafio key={consulta.data.id} desafio={consulta.data} />
}

interface PropsResolver {
  desafio: DesafioDetalle
  /** Dentro del laberinto: se llama al pulsar "Continuar" cuando el servidor confirma el obstáculo. */
  alSuperar?: () => void
}

export function ResolverDesafio({ desafio, alSuperar }: PropsResolver) {
  const { estadoPython, ejecutando, veredicto, registro, falloRegistro, ejecutar, limpiar } = useEjecucion(desafio)
  // Borrador guardado en este dispositivo (comodidad) o el código base del desafío.
  const [codigo, setCodigo] = useState(() => leerBorrador(desafio.id) ?? desafio.codigo_base)
  const [pistasReveladas, setPistasReveladas] = useState(0)

  function cambiarCodigo(nuevo: string) {
    setCodigo(nuevo)
    // Si vuelve a ser el código base no hay borrador que recordar (así "Reiniciar" lo borra de verdad).
    if (nuevo === desafio.codigo_base) borrarBorrador(desafio.id)
    else guardarBorrador(desafio.id, nuevo)
  }

  function reiniciar() {
    borrarBorrador(desafio.id)
    setCodigo(desafio.codigo_base)
    limpiar()
  }

  const ejecutarActual = () => void ejecutar(codigo, pistasReveladas)

  return (
    <div className={estilos.desafio} data-mundo={desafio.mundo.orden}>
      {!alSuperar && <Link to={rutaMundo(desafio.mundo.id)}>← {textos.desafio.volverAlMundo}</Link>}
      <header className={estilos.encabezado}>
        <p className={estilos.nota}>
          {desafio.codigo} · {textos.dificultad[desafio.dificultad]} · {textos.desafio.xp(desafio.xp_base)}
        </p>
        <h1>{desafio.titulo}</h1>
      </header>

      <div className={estilos.distribucion}>
        <section className={estilos.enunciado} aria-label="Enunciado">
          <p>{desafio.enunciado}</p>
          <Pistas
            pistas={desafio.pistas}
            reveladas={pistasReveladas}
            alRevelar={() => setPistasReveladas((n) => Math.min(n + 1, desafio.pistas.length))}
          />
        </section>

        <section className={estilos.zonaEditor} aria-labelledby="titulo-editor">
          <h2 id="titulo-editor">{textos.desafio.tuCodigo}</h2>
          <p id={ID_AYUDA_EDITOR} className={estilos.nota}>
            {textos.desafio.ayudaTeclado}
          </p>
          <EditorCodigo
            valor={codigo}
            alCambiar={cambiarCodigo}
            alEjecutar={ejecutarActual}
            etiqueta={textos.desafio.tuCodigo}
            idDescripcion={ID_AYUDA_EDITOR}
          />
          <div className={estilos.acciones}>
            <Boton
              onClick={ejecutarActual}
              cargando={ejecutando}
              textoCargando={textos.desafio.ejecutando}
              disabled={estadoPython !== 'listo'}
            >
              {textos.desafio.ejecutar}
            </Boton>
            <Boton variante="fantasma" onClick={reiniciar}>
              {textos.desafio.reiniciar}
            </Boton>
            <span className={estilos.nota} role="status">
              {estadoPython === 'preparando' && textos.desafio.preparandoPython}
              {estadoPython === 'fallo' && textos.desafio.pythonNoDisponible}
            </span>
          </div>
          {falloRegistro && <Aviso tipo="error">{textos.desafio.noGuardado}</Aviso>}
          {registro?.desafio_resuelto && (
            <ResumenRecompensa recompensa={registro.recompensa} mensajeSinRecompensa={textos.recompensa.yaResuelto} />
          )}
          {alSuperar && registro?.desafio_resuelto && (
            <Boton onClick={alSuperar} autoFocus>
              {textos.laberinto.continuar}
            </Boton>
          )}
          <PanelResultado veredicto={veredicto} />
        </section>
      </div>
    </div>
  )
}
