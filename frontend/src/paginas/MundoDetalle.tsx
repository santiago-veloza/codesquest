import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { obtenerDesafiosDeMundo, obtenerMundos } from '../api/contenido'
import { CLAVES_CONSULTA } from '../api/clavesConsulta'
import { RUTAS, rutaDesafio } from '../app/rutas'
import { Cargando, ErrorVista, Vacio } from '../componentes/ui/EstadoVista'
import { Tarjeta } from '../componentes/ui/Tarjeta'
import { textos } from '../textos/es'
import estilos from './Paginas.module.css'

export function MundoDetalle() {
  const idMundo = Number(useParams().idMundo)
  const mundos = useQuery({ queryKey: CLAVES_CONSULTA.mundos, queryFn: obtenerMundos })
  const desafios = useQuery({
    queryKey: CLAVES_CONSULTA.desafiosDeMundo(idMundo),
    queryFn: () => obtenerDesafiosDeMundo(idMundo),
  })

  if (desafios.isPending || mundos.isPending) return <Cargando />
  if (desafios.isError) return <ErrorVista mensaje={desafios.error.message} />
  if (mundos.isError) return <ErrorVista mensaje={mundos.error.message} alReintentar={() => void mundos.refetch()} />

  const mundo = mundos.data.find((m) => m.id === idMundo)
  return (
    <div data-mundo={mundo?.orden}>
      <Link to={RUTAS.mapa}>← {textos.mundos.volverAlMapa}</Link>
      <h1 className={estilos.tituloPixel}>{mundo?.nombre}</h1>
      <p className={estilos.descripcion}>{mundo?.descripcion}</p>
      {desafios.data.length === 0 ? (
        <Vacio>{textos.mundos.vacio}</Vacio>
      ) : (
        <ol className={estilos.listaMundos}>
          {desafios.data.map((d) => (
            <li key={d.id}>
              <Tarjeta>
                <p className={estilos.etiquetaMundo}>
                  {d.codigo} · {textos.dificultad[d.dificultad]} · {textos.desafio.xp(d.xp_base)}
                </p>
                <h2>{d.titulo}</h2>
                <Link to={rutaDesafio(d.id)} className={`${estilos.enlaceBoton} ${estilos.enlacePrimario}`}>
                  {textos.mundos.entrar}{' '}
                  <span className="solo-lector">{d.titulo}</span>
                </Link>
              </Tarjeta>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
