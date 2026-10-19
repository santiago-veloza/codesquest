/**
 * Mundo como laberinto: el jugador se mueve en la escena de Godot; al chocar con un obstáculo se
 * abre su desafío en un modal; al resolverlo (confirmado por el servidor) el obstáculo desaparece.
 * Al llegar a la salida con todo resuelto, el servidor completa el mundo y desbloquea el siguiente.
 * Si un enemigo deja al jugador sin vida es game over: al reiniciar, el servidor vuelve a cerrar los
 * candados y la escena empieza de nuevo desde el punto de partida.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { obtenerDesafio, obtenerMundo } from '../../api/contenido'
import { completarMundo, reiniciarMundo } from '../../api/progreso'
import type { MundoLaberinto as DatosMundo, Obstaculo, Recompensa } from '../../api/tipos'
import { CLAVES_CONSULTA } from '../../api/clavesConsulta'
import { RUTAS, rutaMundo } from '../../app/rutas'
import { type ControlEscena, EscenaGodot } from '../../componentes/escena/EscenaGodot'
import { ResumenRecompensa } from '../../componentes/juego/ResumenRecompensa'
import { Aviso } from '../../componentes/ui/Aviso'
import { Boton } from '../../componentes/ui/Boton'
import { Cargando, ErrorVista } from '../../componentes/ui/EstadoVista'
import { Modal } from '../../componentes/ui/Modal'
import { Tarjeta } from '../../componentes/ui/Tarjeta'
import { aplicarRecompensa } from '../../estado/recompensas'
import { useSesion } from '../../estado/sesion'
import { textos } from '../../textos/es'
import { borrarBorrador } from '../../utilidades/borradores'
import { MundoDetalle } from '../MundoDetalle'
import { ResolverDesafio } from '../desafio/Desafio'
import estilos from './MundoLaberinto.module.css'

export function MundoLaberinto() {
  const idMundo = Number(useParams().idMundo)
  const consulta = useQuery({ queryKey: CLAVES_CONSULTA.mundo(idMundo), queryFn: () => obtenerMundo(idMundo) })

  if (consulta.isPending) return <Cargando texto={textos.laberinto.cargando} />
  if (consulta.isError) return <ErrorVista mensaje={consulta.error.message} alReintentar={() => void consulta.refetch()} />
  // Mundos sin laberinto todavía (p. ej. el jefe final): lista simple de desafíos.
  if (consulta.data.mapa.length === 0) return <MundoDetalle />
  return <JuegoLaberinto key={idMundo} mundo={consulta.data} />
}

function JuegoLaberinto({ mundo }: { mundo: DatosMundo }) {
  const escena = useRef<ControlEscena>(null)
  const clienteConsultas = useQueryClient()
  const [obstaculoAbierto, setObstaculoAbierto] = useState<Obstaculo | null>(null)
  const [aviso, setAviso] = useState('')
  const [gameOver, setGameOver] = useState(false)

  const completar = useMutation({
    mutationFn: () => completarMundo(mundo.id),
    onSuccess: (respuesta) => {
      aplicarRecompensa(respuesta.recompensa, clienteConsultas)
      void clienteConsultas.invalidateQueries({ queryKey: CLAVES_CONSULTA.mundos })
    },
  })

  const reiniciar = useMutation({
    mutationFn: async () => {
      await reiniciarMundo(mundo.id)
      // Lo que ya había escrito en los desafíos de este laberinto también se borra.
      for (const o of mundo.obstaculos) borrarBorrador(o.desafio_id)
      return clienteConsultas.fetchQuery({ queryKey: CLAVES_CONSULTA.mundo(mundo.id), queryFn: () => obtenerMundo(mundo.id) })
    },
    onSuccess: (datos) => {
      void clienteConsultas.invalidateQueries({ queryKey: CLAVES_CONSULTA.mundos })
      setAviso('')
      setGameOver(false)
      cargarEnEscena(datos)
    },
  })

  const resueltos = mundo.obstaculos.filter((o) => o.resuelto)

  function cargarEnEscena(datos: DatosMundo) {
    escena.current?.cargarLaberinto({
      mapa: datos.mapa,
      resueltos: datos.obstaculos.filter((o) => o.resuelto).map((o) => o.simbolo),
      tema: datos.orden,
      avatar: useSesion.getState().perfil?.avatar ?? 'byte',
    })
  }

  function alEventoEscena(nombre: string, datos: Record<string, unknown>) {
    switch (nombre) {
      case 'escena_lista':
        cargarEnEscena(mundo)
        break
      case 'laberinto_listo':
        escena.current?.enfocar()
        break
      case 'obstaculo':
        setAviso('')
        setObstaculoAbierto(mundo.obstaculos.find((o) => o.simbolo === datos.simbolo) ?? null)
        break
      case 'golpe':
        setAviso(textos.laberinto.golpe(Number(datos.vida)))
        break
      case 'game_over':
        setAviso('')
        setObstaculoAbierto(null)
        setGameOver(true)
        break
      case 'salida_cerrada':
        setAviso(textos.laberinto.salidaCerrada(Number(datos.pendientes)))
        break
      case 'salida':
        completar.mutate()
        break
    }
  }

  // Sin chocar con el candado la escena no se pausa sola: se le pide (si no, los enemigos atacan
  // mientras el estudiante escribe su código).
  function abrirDesdeLista(obstaculo: Obstaculo) {
    escena.current?.pausar()
    setObstaculoAbierto(obstaculo)
  }

  function cerrarDesafio(superado: boolean) {
    const obstaculo = obstaculoAbierto
    setObstaculoAbierto(null)
    if (superado && obstaculo) {
      escena.current?.resolverObstaculo(obstaculo.simbolo)
      void clienteConsultas.invalidateQueries({ queryKey: CLAVES_CONSULTA.mundo(mundo.id) })
    } else {
      escena.current?.reanudar()
    }
    // El foco vuelve al juego cuando el diálogo termina de cerrarse (ver alCerrado del Modal).
  }

  return (
    <div className={estilos.mundo} data-mundo={mundo.orden}>
      <Link to={RUTAS.mapa}>← {textos.mundos.volverAlMapa}</Link>
      <header>
        <p className={estilos.etiqueta}>{textos.mundos.numero(mundo.orden)}</p>
        <h1 className={estilos.titulo}>{mundo.nombre}</h1>
        <p className={estilos.nota}>{textos.laberinto.instrucciones}</p>
      </header>

      {completar.isSuccess ? (
        <PanelCompletado siguiente={completar.data.siguiente_mundo} recompensa={completar.data.recompensa} />
      ) : (
        <div className={estilos.distribucion}>
          <div className={estilos.escena}>
            <EscenaGodot ref={escena} titulo={textos.laberinto.tituloEscena(mundo.nombre)} alEvento={alEventoEscena} />
            <div className={estilos.bajoEscena}>
              <Boton variante="secundario" onClick={() => escena.current?.enfocar()}>
                {textos.laberinto.enfocar}
              </Boton>
              <span role="status" aria-live="polite" className={estilos.nota}>
                {aviso}
              </span>
            </div>
            {completar.isError && <Aviso tipo="error">{completar.error.message}</Aviso>}
          </div>

          <aside aria-labelledby="titulo-obstaculos" className={estilos.lateral}>
            <h2 id="titulo-obstaculos">{textos.laberinto.obstaculos}</h2>
            <p className={estilos.nota}>{textos.laberinto.contador(resueltos.length, mundo.obstaculos.length)}</p>
            <ol className={estilos.lista}>
              {mundo.obstaculos.map((o) => (
                <li key={o.simbolo} className={o.resuelto ? estilos.resuelto : undefined}>
                  <span>{textos.laberinto.obstaculo(o.simbolo, o.titulo)}</span>
                  <span className={estilos.estadoObstaculo}>
                    {o.resuelto ? textos.laberinto.resuelto : textos.laberinto.pendiente}
                  </span>
                  {/* Alternativa accesible: abrir el desafío sin recorrer el laberinto con el teclado. */}
                  {!o.resuelto && (
                    <Boton variante="fantasma" onClick={() => abrirDesdeLista(o)}>
                      {textos.laberinto.abrirDesafio}
                      <span className="solo-lector"> {o.titulo}</span>
                    </Boton>
                  )}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}

      <Modal
        abierto={obstaculoAbierto !== null}
        titulo={obstaculoAbierto ? textos.laberinto.obstaculo(obstaculoAbierto.simbolo, obstaculoAbierto.titulo) : ''}
        alCerrar={() => cerrarDesafio(false)}
        alCerrado={() => escena.current?.enfocar()}
      >
        {obstaculoAbierto && (
          <DesafioDelObstaculo idDesafio={obstaculoAbierto.desafio_id} alSuperar={() => cerrarDesafio(true)} />
        )}
        <Boton variante="fantasma" onClick={() => cerrarDesafio(false)}>
          {textos.laberinto.volverAlLaberinto}
        </Boton>
      </Modal>

      {/* Sin vida no se puede seguir: Escape también reinicia (no hay otra salida que volver a empezar). */}
      <Modal
        abierto={gameOver}
        titulo={textos.laberinto.gameOverTitulo}
        alCerrar={() => !reiniciar.isPending && reiniciar.mutate()}
        alCerrado={() => escena.current?.enfocar()}
      >
        <div className={estilos.gameOver}>
          <p className={estilos.tituloGameOver} aria-hidden="true">
            {textos.laberinto.gameOverTitulo}
          </p>
          <p>{textos.laberinto.gameOverTexto}</p>
          {reiniciar.isError && <Aviso tipo="error">{reiniciar.error.message}</Aviso>}
          <Boton
            onClick={() => reiniciar.mutate()}
            cargando={reiniciar.isPending}
            textoCargando={textos.laberinto.reiniciando}
            autoFocus
          >
            {textos.laberinto.reiniciar}
          </Boton>
        </div>
      </Modal>
    </div>
  )
}

function DesafioDelObstaculo({ idDesafio, alSuperar }: { idDesafio: number; alSuperar: () => void }) {
  const consulta = useQuery({ queryKey: CLAVES_CONSULTA.desafio(idDesafio), queryFn: () => obtenerDesafio(idDesafio) })
  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <ErrorVista mensaje={consulta.error.message} alReintentar={() => void consulta.refetch()} />
  return <ResolverDesafio key={idDesafio} desafio={consulta.data} alSuperar={alSuperar} />
}

interface PropsCompletado {
  siguiente: { id: number; nombre: string } | null
  recompensa: Recompensa
}

function PanelCompletado({ siguiente, recompensa }: PropsCompletado) {
  return (
    <Tarjeta>
      <h2 className={estilos.titulo}>{textos.laberinto.completadoTitulo}</h2>
      <ResumenRecompensa recompensa={recompensa} />
      {siguiente ? (
        <>
          <p>{textos.laberinto.completadoSiguiente(siguiente.nombre)}</p>
          <Link to={rutaMundo(siguiente.id)} className={estilos.enlaceSiguiente}>
            {textos.laberinto.irAlSiguiente(siguiente.nombre)}
          </Link>
        </>
      ) : (
        <p>{textos.laberinto.completadoTodos}</p>
      )}
    </Tarjeta>
  )
}
