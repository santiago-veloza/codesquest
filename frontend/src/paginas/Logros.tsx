import { useQuery } from '@tanstack/react-query'

import { obtenerLogros, urlIcono } from '../api/gamificacion'
import type { LogroDelUsuario } from '../api/tipos'
import { CLAVES_CONSULTA } from '../api/clavesConsulta'
import { Cargando, ErrorVista } from '../componentes/ui/EstadoVista'
import { textos } from '../textos/es'
import estilos from './Logros.module.css'
import paginas from './Paginas.module.css'

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })

export function Logros() {
  const consulta = useQuery({ queryKey: CLAVES_CONSULTA.logros, queryFn: obtenerLogros })

  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <ErrorVista mensaje={consulta.error.message} alReintentar={() => void consulta.refetch()} />

  const obtenidos = consulta.data.filter((l) => l.obtenido).length
  return (
    <div>
      <h1 className={paginas.tituloPixel}>{textos.logros.titulo}</h1>
      <p>{textos.logros.resumen(obtenidos, consulta.data.length)}</p>
      <ul className={estilos.rejilla}>
        {consulta.data.map((logro) => (
          <TarjetaLogro key={logro.codigo} logro={logro} />
        ))}
      </ul>
    </div>
  )
}

function TarjetaLogro({ logro }: { logro: LogroDelUsuario }) {
  return (
    <li className={`${estilos.logro} ${logro.obtenido ? estilos.obtenido : estilos.bloqueado}`}>
      <img src={urlIcono(logro.icono)} alt="" width={64} height={64} className={estilos.icono} />
      <div>
        <h2 className={estilos.nombre}>{logro.nombre}</h2>
        <p>{logro.descripcion}</p>
        <p className={estilos.estado}>
          {logro.obtenido && logro.fecha_obtencion
            ? textos.logros.obtenido(formatoFecha.format(new Date(logro.fecha_obtencion)))
            : textos.logros.pendiente}
        </p>
      </div>
    </li>
  )
}
