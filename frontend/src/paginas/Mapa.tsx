import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { obtenerMundos } from '../api/contenido'
import { obtenerPerfil } from '../api/cuenta'
import type { Mundo } from '../api/tipos'
import { CLAVES_CONSULTA } from '../api/clavesConsulta'
import { rutaMundo } from '../app/rutas'
import { BarraExperiencia } from '../componentes/juego/BarraExperiencia'
import { BarraProgreso } from '../componentes/ui/BarraProgreso'
import { Cargando, ErrorVista } from '../componentes/ui/EstadoVista'
import { Tarjeta } from '../componentes/ui/Tarjeta'
import { ENERGIA_MAXIMA } from '../config/juego'
import { textos } from '../textos/es'
import estilos from './Paginas.module.css'

export function Mapa() {
  const perfil = useQuery({ queryKey: CLAVES_CONSULTA.perfil, queryFn: obtenerPerfil })
  const mundos = useQuery({ queryKey: CLAVES_CONSULTA.mundos, queryFn: obtenerMundos })

  if (perfil.isPending || mundos.isPending) return <Cargando />
  if (perfil.isError) return <ErrorVista mensaje={perfil.error.message} alReintentar={() => void perfil.refetch()} />
  if (mundos.isError) return <ErrorVista mensaje={mundos.error.message} alReintentar={() => void mundos.refetch()} />

  const { apodo, nivel, experiencia, puntos, energia } = perfil.data
  return (
    <div>
      <h1 className={estilos.tituloPixel}>{textos.mapa.titulo}</h1>
      <div className={estilos.panel}>
        <Tarjeta titulo={textos.mapa.bienvenida(apodo)}>
          <div className={estilos.estadisticas}>
            <p>
              {textos.mapa.nivel(nivel)} · {textos.mapa.experienciaTexto(experiencia)} · {textos.mapa.puntos(puntos)}
            </p>
            <BarraExperiencia perfil={perfil.data} />
            <BarraProgreso etiqueta={textos.mapa.energia} valor={energia} maximo={ENERGIA_MAXIMA} variante="energia" />
          </div>
        </Tarjeta>
      </div>
      <ol className={estilos.listaMundos}>
        {mundos.data.map((mundo) => (
          <li key={mundo.id}>
            <TarjetaMundo mundo={mundo} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function TarjetaMundo({ mundo }: { mundo: Mundo }) {
  const bloqueado = mundo.estado === 'bloqueado'
  return (
    <Tarjeta data-mundo={mundo.orden} className={bloqueado ? estilos.mundoBloqueado : undefined}>
      <p className={estilos.etiquetaMundo}>{textos.mundos.numero(mundo.orden)}</p>
      <h2>{mundo.nombre}</h2>
      <p className={estilos.textoSuave}>{mundo.conceptos}</p>
      <p>
        <span className={`${estilos.insignia} ${estilos[`estado_${mundo.estado}`]}`}>
          {bloqueado && <span aria-hidden="true">🔒 </span>}
          {textos.mundos.estado[mundo.estado]}
        </span>
      </p>
      {bloqueado ? (
        <p className={estilos.textoSuave}>{textos.mundos.bloqueadoAyuda}</p>
      ) : (
        <>
          <BarraProgreso etiqueta={textos.mundos.progreso} valor={mundo.porcentaje} maximo={100} textoValor={`${mundo.porcentaje}%`} />
          <Link to={rutaMundo(mundo.id)} className={`${estilos.enlaceBoton} ${estilos.enlacePrimario}`}>
            {textos.mundos.entrar}{' '}
            <span className="solo-lector">{mundo.nombre}</span>
          </Link>
        </>
      )}
    </Tarjeta>
  )
}
