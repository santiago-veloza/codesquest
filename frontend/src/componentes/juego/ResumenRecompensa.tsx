import { urlIcono } from '../../api/gamificacion'
import type { Recompensa } from '../../api/tipos'
import { textos } from '../../textos/es'
import estilos from './ResumenRecompensa.module.css'

/**
 * Lo que ganó el estudiante, mostrado en el mismo lugar donde actuó (dentro del modal del desafío o
 * en el panel de mundo completado). Es la versión accesible de los avisos flotantes.
 */
interface Props {
  recompensa: Recompensa
  /** Qué decir si no se ganó nada (p. ej. un desafío que ya estaba resuelto); sin él no se muestra nada. */
  mensajeSinRecompensa?: string
}

export function ResumenRecompensa({ recompensa, mensajeSinRecompensa }: Props) {
  const { xp_otorgada, puntos_otorgados, subio_de_nivel, nivel, logros_nuevos } = recompensa
  const sinNada = puntos_otorgados === 0 && logros_nuevos.length === 0
  if (sinNada && !mensajeSinRecompensa) return null

  return (
    <div role="status" className={estilos.resumen}>
      {sinNada ? (
        <p className={estilos.nota}>{mensajeSinRecompensa}</p>
      ) : (
        <p className={estilos.cifras}>
          {xp_otorgada > 0 && <span className={estilos.xp}>{textos.recompensa.xp(xp_otorgada)}</span>}
          {puntos_otorgados > 0 && <span>{textos.recompensa.puntos(puntos_otorgados)}</span>}
        </p>
      )}
      {subio_de_nivel && <p className={estilos.nivel}>{textos.recompensa.subioDeNivel(nivel)}</p>}
      {logros_nuevos.length > 0 && (
        <ul className={estilos.logros}>
          {logros_nuevos.map((logro) => (
            <li key={logro.codigo}>
              <img src={urlIcono(logro.icono)} alt="" width={32} height={32} />
              <span>{textos.recompensa.logro(logro.nombre)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
